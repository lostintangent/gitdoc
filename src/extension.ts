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
      if (
        e.affectsConfiguration("gitdoc.enabled") ||
        e.affectsConfiguration("gitdoc.excludeBranches") ||
        e.affectsConfiguration("gitdoc.autoCommitDelay") ||
        e.affectsConfiguration("gitdoc.filePattern")
      ) {
        checkEnabled(git);
      }
    })
  );
}

let watchers: vscode.Disposable[] = [];
async function checkEnabled(git: GitAPI) {
  // Dispose all existing watchers
  watchers.forEach((watcher) => watcher.dispose());
  watchers = [];

  if (git.repositories.length === 0 || !store.enabled) {
    updateContext(false, false);
    return;
  }

  // Check if any repository has a valid branch and isn't excluded
  let enabled = false;
  for (const repository of git.repositories) {
    let branchName = repository.state?.HEAD?.name;

    if (!branchName) {
      const refs = await repository.getRefs();
      branchName = refs?.find((ref) => ref.type === RefType.Head)?.name;
    }

    if (branchName && !config.excludeBranches.includes(branchName)) {
      enabled = true;
      break;
    }
  }

  updateContext(enabled, false);

  if (enabled) {
    watchers.push(watchForChanges(git));
  }
}

export async function deactivate() {
  if (store.enabled && config.commitOnClose) {
    const git = await getGitApi();
    if (git && git.repositories.length > 0) {
      // Commit changes in all repositories
      await Promise.all(git.repositories.map((repo) => commit(repo)));
    }
  }
}
