import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { getGitApi, GitAPI, RefType } from "./git";
import { store } from "./store";
import { commit, watchForChanges, ensureStatusBarItem } from "./watcher";
import { updateContext } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  const git = await getGitApi();
  if (!git) {
    return;
  }

  // Initialize the store and context based on the configuration
  store.enabled = config.enabled;
  updateContext(config.enabled, false); // Set initial context to match config

  // Create status bar item and show it immediately
  const statusBar = ensureStatusBarItem();
  statusBar.show();
  context.subscriptions.push(statusBar);

  registerCommands(context);

  // Enable/disable the auto-commit watcher as the user
  // opens/closes Git repos, modifies their settings
  // and/or manually enables it via the command palette.
  context.subscriptions.push(git.onDidOpenRepository(() => checkEnabled(git)));
  context.subscriptions.push(git.onDidCloseRepository(() => checkEnabled(git)));

  // Initial check of enabled state
  await checkEnabled(git);

  // Watch for store changes
  reaction(
    () => store.enabled,
    (enabled) => {
      updateContext(enabled, true);
      checkEnabled(git);
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gitdoc.enabled") ||
        e.affectsConfiguration("gitdoc.excludeBranches") ||
        e.affectsConfiguration("gitdoc.autoCommitDelay") ||
        e.affectsConfiguration("gitdoc.filePattern")) {
        checkEnabled(git);
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
