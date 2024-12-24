import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { getGitApi, GitAPI, RefType } from "./git";
import { store } from "./store";
import { commit, watchForChanges } from "./watcher";
import { updateContext } from "./utils";

export async function activate(context: vscode.ExtensionContext) {
  const git = await getGitApi();
  if (!git) {
    return;
  }

  // Initialize the store based on the
  // user/workspace configuration.
  store.enabled = config.enabled;

  registerCommands(context);

  // Enable/disable the auto-commit watcher as the user
  // opens/closes Git repos, modifies their settings
  // and/or manually enables it via the command palette.
  context.subscriptions.push(git.onDidOpenRepository(() => checkEnabled(git)));
  context.subscriptions.push(git.onDidCloseRepository(() => checkEnabled(git)));

  reaction(
    () => [store.enabled],
    () => checkEnabled(git)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gitdoc.enabled") || e.affectsConfiguration("gitdoc.excludeBranches")) {
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
