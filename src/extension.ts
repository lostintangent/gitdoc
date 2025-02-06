import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { getGitApi, GitAPI, RefType } from "./git";
import { store } from "./store";
import { commit, watchForChanges, ensureStatusBarItem, updateStatusBarItem } from "./watcher";
import { updateContext } from "./utils";
import * as minimatch from "minimatch";

// Helper function for file pattern matching
function matches(uri: vscode.Uri) {
  return minimatch(uri.path, config.filePattern, { dot: true });
}

export async function activate(context: vscode.ExtensionContext) {
  // Wait for Git extension to be ready
  const git = await getGitApi();
  if (!git) {
    return;
  }

  // Wait for initial repository to be available
  if (git.repositories.length === 0) {
    await new Promise<void>((resolve) => {
      const disposable = git.onDidOpenRepository(() => {
        disposable.dispose();
        resolve();
      });
    });
  }

  // Initialize the store and context based on the configuration
  const initialEnabled = vscode.workspace.getConfiguration('gitdoc').get('enabled', false);
  store.enabled = initialEnabled;
  updateContext(initialEnabled, false); // Set initial context to match config

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

  // Create a debounced version of updateStatusBarItem
  let updateTimeout: NodeJS.Timeout | null = null;
  const debouncedUpdateStatusBar = (editor: vscode.TextEditor | undefined) => {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    updateTimeout = setTimeout(() => {
      updateStatusBarItem(editor);
    }, 50); // 50ms debounce
  };

  // Watch for active editor changes to update icon state
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      debouncedUpdateStatusBar(editor);
    })
  );

  // Set initial icon state
  updateStatusBarItem(vscode.window.activeTextEditor);

  // Initial check of enabled state
  await checkEnabled(git);

  // Watch for store changes
  reaction(
    () => store.enabled,
    (enabled) => {
      updateContext(enabled, true);
      checkEnabled(git);
      debouncedUpdateStatusBar(vscode.window.activeTextEditor);
    }
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gitdoc.enabled") ||
        e.affectsConfiguration("gitdoc.excludeBranches") ||
        e.affectsConfiguration("gitdoc.autoCommitDelay") ||
        e.affectsConfiguration("gitdoc.filePattern")) {
        checkEnabled(git);
        debouncedUpdateStatusBar(vscode.window.activeTextEditor);
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
