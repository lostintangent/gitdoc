import { debounce } from "debounce";
import * as vscode from "vscode";
import config from "./config";
import { ForcePushMode, GitAPI, Repository, getSubmodule } from "./git"; // Import getSubmodule from src/git.ts
import { DateTime } from "luxon";
import { store } from "./store";
import { reaction } from "mobx";
import * as minimatch from "minimatch";

const REMOTE_NAME = "origin";

async function pushRepository(
  repository: Repository,
  forcePush: boolean = false,
  submodule?: string // Add a submodule name as an optional parameter
) {
  store.isPushing = true;

  try {
    if (config.autoPull === "onPush") {
      await pullRepository(repository, submodule); // Pass the submodule name to pullRepository
    }

    const pushArgs: any[] = [REMOTE_NAME];

    // If pushing a submodule, use the submodule name as the branch name
    if (submodule) {
      pushArgs.push(submodule);
    } else {
      pushArgs.push(repository.state.HEAD?.name);
    }

    pushArgs.push(false);

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
      await pushRepository(repository, true, submodule); // Pass the submodule name to pushRepository
    }
  }
}

async function pullRepository(repository: Repository, submodule?: string) { // Add a submodule name as an optional parameter
  store.isPulling = true;

  const pullArgs: any[] = [];

  // If pulling a submodule, use the submodule name as the refspec
  if (submodule) {
    pullArgs.push(REMOTE_NAME, submodule);
  }

  await repository.pull(...pullArgs);

  store.isPulling = false;
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
    // Group changes by submodule name, using null for the main repository
    const changesBySubmodule = new Map<string | null, vscode.Uri[]>();
    for (const change of changes) {
      const submodule = change.submodule || null; // Use the submodule property of the change
      const changedUris = changesBySubmodule.get(submodule) || [];
      changedUris.push(change.uri);
      changesBySubmodule.set(submodule, changedUris);
    }

    // Filter the changes by the file pattern and commit them to each submodule first, then to the main repository
    for (const [submodule, changedUris] of changesBySubmodule) {
      const filteredUris = changedUris.filter((uri) => matches(uri));
      if (filteredUris.length > 0) {
        if (config.commitValidationLevel !== "none") {
          const diagnostics = vscode.languages
            .getDiagnostics()
            .filter(([uri, diagnostics]) => {
              const isChanged = filteredUris.find(
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
        await repository.repository.add(filteredUris);
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
          await pushRepository(repository, false, submodule); // Pass the submodule name to pushRepository
        }

        if (config.autoPull === "onCommit") {
          await pullRepository(repository, submodule); // Pass the submodule name to pullRepository
        }
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

    statusBarItem.text = "$(mirror)";
    statusBarItem.tooltip = "GitDoc: Auto-commiting files on save";
    statusBarItem.command = "gitdoc.disable";
    statusBarItem.show();
  }

  return statusBarItem;
}

let disposables: vscode.Disposable[] = [];
export function watchForChanges(git: GitAPI): vscode.Disposable {
  // Iterate over all repositories, not just the first one
  for (const repository of git.repositories) {
    const commitAfterDelay = debouncedCommit(repository);
    disposables.push(repository.state.onDidChange(commitAfterDelay));
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
      // Push changes to each repository separately
      for (const repository of git.repositories) {
        await pushRepository(repository);
      }
    }, config.autoPushDelay);

    disposables.push({
      dispose: () => {
        clearInterval(interval);
      },
    });
  }

  if (config.autoPull === "afterDelay") {
    const interval = setInterval(async () => {
      // Pull changes from each repository separately
      for (const repository of git.repositories) {
        await pullRepository(repository);
      }
    }, config.autoPullDelay);

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
    // Pull changes from each repository separately
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
