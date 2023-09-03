import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { getGitApi, GitAPI } from "./git";
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
      if (e.affectsConfiguration("gitdoc.enabled")) {
        checkEnabled(git);
      }
    })
  );
}

let watchers: vscode.Disposable[] = [];
async function checkEnabled(git: GitAPI) {
  for (const watcher of watchers) {
    watcher.dispose();
  }
  watchers = [];

  const enabled =
    git.repositories.length > 0 &&
    (store.enabled || git.repositories[0]?.state.HEAD?.name === EXTENSION_NAME);

  updateContext(enabled, false);

  if (enabled) {
    watchers = git.repositories.map((repository) => watchForChanges(git));
  }
}

export async function deactivate() {
  if (store.enabled && config.commitOnClose) {
    const git = await getGitApi();
    if (git && git.repositories.length > 0) {
      for (const repository of git.repositories) {
        if (vscode.window.activeTextEditor) {
          return commit(repository, vscode.window.activeTextEditor.document.uri);
        }
      }
    }
  }
}
