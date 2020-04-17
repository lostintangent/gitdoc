import { reaction } from "mobx";
import * as vscode from "vscode";
import { registerCommands } from "./commands";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { getGitApi, GitAPI } from "./git";
import { store } from "./store";
import { watchForChanges } from "./watcher";

export async function activate(context: vscode.ExtensionContext) {
  const git = await getGitApi();
  if (!git) {
    return;
  }

  store.enabled = config.enabled;

  registerCommands(context);

  context.subscriptions.push(
    git.onDidOpenRepository((e) => {
      checkEnabled(git);

      let lastBranch: string;
      context.subscriptions.push(
        e.state.onDidChange(() => {
          if (
            lastBranch &&
            lastBranch.localeCompare(git.repositories[0].state.HEAD?.name!) !==
              0
          ) {
            lastBranch = git.repositories[0].state.HEAD?.name!;
            checkEnabled(git);
          }
        })
      );
    })
  );

  context.subscriptions.push(
    git.onDidCloseRepository(() => {
      checkEnabled(git);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("gitdoc.enabled")) {
        checkEnabled(git);
      }
    })
  );

  reaction(
    () => [store.enabled],
    () => {
      checkEnabled(git);
    }
  );
}

let watcher: vscode.Disposable;
async function checkEnabled(git: GitAPI) {
  if (
    git.repositories.length > 0 &&
    (store.enabled || git.repositories[0]?.state.HEAD?.name === EXTENSION_NAME)
  ) {
    store.enabled = true;
    vscode.commands.executeCommand("setContext", "gitdoc:enabled", true);
    vscode.commands.executeCommand(
      "setContext",
      "gitdoc:branchEnabled",
      config.enabled
    );

    watcher = watchForChanges(git);
  } else {
    store.enabled = false;
    vscode.commands.executeCommand("setContext", "gitdoc:enabled", false);
    vscode.commands.executeCommand(
      "setContext",
      "gitdoc:branchEnabled",
      config.enabled
    );

    if (watcher) {
      watcher.dispose();
    }
  }
}
