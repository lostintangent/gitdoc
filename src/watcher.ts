import { debounce } from "debounce";
import * as vscode from "vscode";
import config from "./config";
import { ForcePushMode, GitAPI, Repository } from "./git";
import { DateTime } from "luxon";
import { store } from "./store";
import { reaction } from "mobx";
import * as minimatch from "minimatch";

const REMOTE_NAME = "origin";

async function pushRepository(
  repository: Repository,
  forcePush: boolean = false
) {
  store.isPushing = true;

  try {
    if (config.autoPull === "onPush") {
      await pullRepository(repository);
    }

    const pushArgs: any[] = [REMOTE_NAME, repository.state.HEAD?.name, false];

    if (forcePush) {
      pushArgs.push(ForcePushMode.Force);
    } else if (config.pushMode !== "push") {
      const pushMode =
        config.pushMode === "forcePush"
          ? ForcePushMode.Force
          : ForcePushMode.ForceWithLease;

      pushArgs.push(pushMode);
    }

    await repository.push(...pushArgs);

    store.isPushing = false;
  } catch {
    store.isPushing = false;

    if (
      await vscode.window.showWarningMessage(
        "Remote repository contains conflicting changes.",
        "Force Push"
      )
    ) {
      await pushRepository(repository, true);
    }
  }
}

async function pullRepository(repository: Repository) {
  store.isPulling = true;

  await repository.pull();

  store.isPulling = false;
}

function matches(uri: vscode.Uri) {
  return minimatch(uri.path, config.filePattern, { dot: true });
}

export async function commit(repository: Repository, uri: vscode.Uri, message?: string) {
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
      if (config.commitValidationLevel !== "none") {
        const diagnostics = vscode.languages
          .getDiagnostics()
          .filter(([uri, diagnostics]) => {
            const isChanged = changedUris.find(
              (changedUri) =>
                changedUri.toString().localeCompare(uri.toString()) === 0
            );

            return isChanged
              ? diagnostics.some(
                (diagnostic) =>
                  diagnostic.severity === vscode.DiagnosticSeverity.Error ||
                  (config.commitValidationLevel === "warning" &&
                    diagnostic.severity === vscode.DiagnosticSeverity.Warning)
              )
              : false;
          });

        if (diagnostics.length > 0) {
          return;
        }
      }

      // @ts-ignore
      await repository.repository.add([uri]);
      let currentTime = DateTime.now();

      // Ensure that the commit dates are formatted
      // as UTC, so that other clients can properly
      // re-offset them based on the user's locale.
      const commitDate = currentTime.toUTC().toString();
      process.env.GIT_AUTHOR_DATE = commitDate;
      process.env.GIT_COMMITTER_DATE = commitDate;

      if (config.timeZone) {
        currentTime = currentTime.setZone(config.timeZone);
      }

      const commitMessage =
        message || currentTime.toFormat(config.commitMessageFormat);

      await repository.commit(commitMessage);

      delete process.env.GIT_AUTHOR_DATE;
      delete process.env.GIT_COMMITTER_DATE;

      if (config.autoPush === "onCommit") {
        await pushRepository(repository);
      }

      if (config.autoPull === "onCommit") {
        await pullRepository(repository);
      }
    }
  }
}

const commitMap = new Map<Repository, () => Promise<void>>();
function debouncedCommit(git: GitAPI, uri: vscode.Uri) {
  const repository = git.getRepository(uri);
  if (!repository) {
    return;
  }

  if (!commitMap.has(repository)) {
    commitMap.set(
      repository,
      debounce(async () => {
        commit(repository, uri);
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

    statusBarItem.text = "$(mirror)";
    statusBarItem.tooltip = "GitDoc: Auto-commiting files on save";
    statusBarItem.command = "gitdoc.disable";
    statusBarItem.show();
  }

  return statusBarItem;
}

let disposables: vscode.Disposable[] = [];
export function watchForChanges(git: GitAPI): vscode.Disposable {
  for (const repository of git.repositories) {
    const commitAfterDelay = (uri: vscode.Uri) => {
      const debounced = debouncedCommit(git, uri);
      if (debounced) {
        debounced();
      }
    };
    disposables.push(repository.state.onDidChange(() => {
      if (vscode.window.activeTextEditor) {
        commitAfterDelay(vscode.window.activeTextEditor.document.uri);
      }
    }));
  }

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
      for (const repository of git.repositories) {
        pushRepository(repository);
      }
    }, config.autoPushDelay);

    disposables.push({
      dispose: () => {
        clearInterval(interval);
      },
    });
  }

  if (config.autoPull === "afterDelay") {
    const interval = setInterval(
      async () => {
        for (const repository of git.repositories) {
          pullRepository(repository);
        }
      },
      config.autoPullDelay
    );

    disposables.push({
      dispose: () => clearInterval(interval),
    });
  }

  const reactionDisposable = reaction(
    () => [store.isPushing, store.isPulling],
    () => {
      const suffix = store.isPushing
        ? " (Pushing...)"
        : store.isPulling
        ? " (Pulling...)"
        : "";
      statusBarItem!.text = `$(mirror)${suffix}`;
    }
  );

  disposables.push({
    dispose: reactionDisposable,
  });

  if (config.pullOnOpen) {
    for (const repository of git.repositories) {
      pullRepository(repository);
    }
  }

  return {
    dispose: () => {
      disposables.forEach((disposable) => disposable.dispose());
      disposables = [];
    },
  };
}
