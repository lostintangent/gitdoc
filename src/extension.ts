import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { getGitApi, GitAPI, RefType } from "./git";
import { store } from "./store";
import { commit, watchForChanges, ensureStatusBarItem, updateStatusBarItem } from "./watcher";
import { updateContext } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  // Wait for Git extension to be ready
  const git = await getGitApi();
  if (!git) {
    return;
  }

  // Wait for initial repository to be available
  // This is needed to fix issue #90 where GitDoc is inactive on codespace start
  if (git.repositories.length === 0) {
    await new Promise<void>((resolve) => {
      const disposable = git.onDidOpenRepository(() => {
        disposable.dispose();
        resolve();
      });
    });
  }

  // Initialize the store based on the configuration
  store.enabled = config.enabled;

  // Create status bar item and ensure it's properly initialized
  const statusBar = ensureStatusBarItem();
  context.subscriptions.push(statusBar);

  registerCommands(context);

  // Enable/disable the auto-commit watcher as the user
  // opens/closes Git repos, modifies their settings
  // and/or manually enables it via the command palette.
  context.subscriptions.push(git.onDidOpenRepository(() => checkEnabled(git)));
  context.subscriptions.push(git.onDidCloseRepository(() => checkEnabled(git)));

  // Watch for active editor changes to update icon state
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateStatusBarItem(editor);
    })
  );

  // Initial check of enabled state
  await checkEnabled(git);

  // Watch for store changes
  reaction(
    () => store.enabled,
    (enabled) => {
      checkEnabled(git);
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gitdoc.enabled") ||
        e.affectsConfiguration("gitdoc.excludeBranches") ||
        e.affectsConfiguration("gitdoc.autoCommitDelay") ||
        e.affectsConfiguration("gitdoc.filePattern") ||
        e.affectsConfiguration("gitdoc.alwaysShowStatusBarIcon")) {
        checkEnabled(git);
        updateStatusBarItem(vscode.window.activeTextEditor);
      }
    })
  );
}

let watcher: vscode.Disposable | null;
async function checkEnabled(git: GitAPI) {
  if (watcher) {
    watcher.dispose();
    watcher = null;
  }

  let branchName = git.repositories[0]?.state?.HEAD?.name;

  if (!branchName) {
    const refs = await git.repositories[0]?.getRefs();
    branchName = refs?.find((ref) => ref.type === RefType.Head)?.name;
  }

  const enabled =
    git.repositories.length > 0 &&
    store.enabled && !!branchName && !config.excludeBranches.includes(branchName);

  updateContext(enabled, false);
  updateStatusBarItem(vscode.window.activeTextEditor);

  if (enabled) {
    watcher = watchForChanges(git);
  }
}

export async function deactivate() {
  if (store.enabled && config.commitOnClose) {
    const git = await getGitApi();
    if (git && git.repositories.length > 0) {
      return commit(git.repositories[0]);
    }
  }
}
