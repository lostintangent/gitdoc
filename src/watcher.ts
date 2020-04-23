import { debounce } from "debounce";
import * as vscode from "vscode";
import config from "./config";
import { GitAPI, Repository } from "./git";
import moment = require("moment");
import { store } from "./store";
import { reaction } from "mobx";
import * as minimatch from "minimatch";

export enum ForcePushMode {
  Force,
  ForceWithLease,
}

async function pushRepository(repository: Repository) {
  store.isPushing = true;

  // @ts-ignore
  await repository._repository.pushTo(
    "origin",
    repository.state.HEAD?.name,
    false,
    ForcePushMode.Force
  );

  store.isPushing = false;
}

function matches(uri: vscode.Uri) {
  return minimatch(uri.path, config.filePattern, { dot: true });
}

export async function commit(repository: Repository, message?: string) {
  const changes = [
    ...repository.state.workingTreeChanges,
    ...repository.state.mergeChanges,
    ...repository.state.indexChanges,
  ];

  if (changes.length > 0) {
    const changedUris = changes
      .filter((change) => matches(change.uri))
      .map((change) => change.uri);

    if (changedUris.length > 0) {
      // @ts-ignore
      await repository._repository.add(changedUris);
      const momentInstance = moment();
      const commitMessage =
        message || momentInstance.format(config.commitMessageFormat);
      const date = momentInstance.format();

      process.env.GIT_AUTHOR_DATE = date;
      process.env.GIT_COMMITTER_DATE = date;

      await repository.commit(commitMessage);

      delete process.env.GIT_AUTHOR_DATE;
      delete process.env.GIT_COMMITTER_DATE;

      if (config.autoPush === "onCommit") {
        await pushRepository(repository);
      }
    }
  }
}

const commitMap = new Map();
function debouncedCommit(repository: Repository) {
  if (!commitMap.has(repository)) {
    commitMap.set(
      repository,
      debounce(async () => {
        commit(repository);
      }, config.autoCommitDelay)
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
  const commitAfterDelay = debouncedCommit(git.repositories[0]);
  disposables.push(git.repositories[0].state.onDidChange(commitAfterDelay));

  ensureStatusBarItem();

  disposables.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && matches(editor.document.uri)) {
        statusBarItem?.show();
      } else {
        statusBarItem?.hide();
      }
    })
  );

  if (
    vscode.window.activeTextEditor &&
    matches(vscode.window.activeTextEditor.document.uri)
  ) {
    statusBarItem?.show();
  } else {
    statusBarItem?.hide();
  }

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
      const suffix = store.isPushing ? " (Pushing...)" : "";
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
