import { debounce } from "debounce";
import * as vscode from "vscode";
import config from "./config";
import { GitAPI, Repository } from "./git";
import moment = require("moment");
import { store } from "./store/store";
import { reaction } from "mobx";

async function pushRepository(repository: Repository) {
  store.isPushing = true;
  await repository.push("origin", repository.state.HEAD?.name);
  store.isPushing = false;
}

const commitMap = new Map();
function debouncedCommit(repository: Repository) {
  if (!commitMap.has(repository)) {
    commitMap.set(
      repository,
      debounce(async () => {
        const message = moment().format(config.commitMessageFormat);
        await repository.commit(message, { all: true });

        if (config.autoPush === "onSave") {
          await pushRepository(repository);
        }
      }, 100)
    );
  }

  return commitMap.get(repository);
}

let statusBarItem: vscode.StatusBarItem | null = null;
export function ensureStatusBarItem() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );

    statusBarItem.text = "$(git-commit) GitDoc";
    statusBarItem.tooltip = "Auto-commiting files on save";
    statusBarItem.command = "gitdoc.disable";
    statusBarItem.show();
  }

  return statusBarItem;
}

let disposables: vscode.Disposable[] = [];
export function watchForChanges(git: GitAPI): vscode.Disposable {
  disposables.push(
    git.repositories[0].state.onDidChange(() => {
      if (git.repositories[0].state.workingTreeChanges?.length > 0) {
        debouncedCommit(git.repositories[0])();
      }
    })
  );

  ensureStatusBarItem();

  disposables.push({
    dispose: () => {
      statusBarItem?.dispose();
      statusBarItem = null;
    },
  });

  if (config.autoPush === "afterDelay") {
    const interval = setInterval(async () => {
      pushRepository(git.repositories[0]);
    }, config.autoPushDelay);

    disposables.push({
      dispose: () => {
        clearInterval(interval);
      },
    });
  }

  const reactionDisposable = reaction(
    () => [store.isPushing],
    () => {
      const suffix = store.isPushing ? " (Syncing...)" : "";
      statusBarItem!.text = `$(git-commit) GitDoc${suffix}`;
    }
  );

  disposables.push({
    dispose: reactionDisposable,
  });

  return {
    dispose: () => {
      disposables.forEach((disposable) => disposable.dispose());
      disposables = [];
    },
  };
}
