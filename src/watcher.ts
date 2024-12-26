import * as vscode from "vscode";
import config from "./config";
import { ForcePushMode, GitAPI, Repository, RefType } from "./git";
import { DateTime } from "luxon";
import { store } from "./store";
import { reaction } from "mobx";
import * as minimatch from "minimatch";

const REMOTE_NAME = "origin";

async function pushRepository(
  repository: Repository,
  forcePush: boolean = false
) {
  if (!(await hasRemotes(repository))) return;

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
  if (!(await hasRemotes(repository))) return;

  store.isPulling = true;

  await repository.pull();

  store.isPulling = false;
}

async function hasRemotes(repository: Repository): Promise<boolean> {
  const refs = await repository.getRefs();
  return refs.some((ref) => ref.type === RefType.RemoteHead);
}

function matches(uri: vscode.Uri) {
  return minimatch(uri.path, config.filePattern, { dot: true });
}

async function generateCommitMessage(repository: Repository, changedUris: vscode.Uri[]): Promise<string | null> {
  const diffs = await Promise.all(
    changedUris.map(async (uri) => {
      const filePath = vscode.workspace.asRelativePath(uri);
      const fileDiff = await repository.diffWithHEAD(filePath);

      return `## ${filePath}
---
${fileDiff}`;
    }));

  const model = await vscode.lm.selectChatModels({ family: config.aiModel });
  if (!model || model.length === 0) return null;

  const prompt = `# Instructions

You are a developer working on a project that uses Git for version control. You have made some changes to the codebase and are preparing to commit them to the repository. Your task is to summarize the changes that you have made into a concise commit message that describes the essence of the changes that were made.

* Always start the commit message with a present tense verb such as "Update", "Fix", "Modify", "Add", "Improve", "Organize", "Arrange", "Mark", etc.
* Respond in plain text, with no markdown formatting, and without any extra content. Simply respond with the commit message, and without a trailing period.
* Don't reference the file paths that were changed, but make sure summarize all significant changes (using your best judgement).
* When multiple files have been changed, give priority to edited files, followed by added files, and then renamed/deleted files.
* When a change includes adding an emoji to a list item in markdown, then interpret a runner emoji as marking it as in progress, a checkmark emoji as meaning its completed, and a muscle emoji as meaning its a stretch goal.
${config.aiUseEmojis ? "* Prepend an emoji to the message that expresses the nature of the changes, and is as specific/relevant to the subject and/or action of the changes as possible.\n" : ""}
# Code change diffs

${diffs.join("\n\n")}

${config.aiCustomInstructions ? `# Additional Instructions (Important!)
  
${config.aiCustomInstructions}
` : ""}
# Commit message

`;

  const response = await model[0].sendRequest([{
    role: vscode.LanguageModelChatMessageRole.User,
    name: "User",
    content: prompt
  }]);

  let summary = "";
  for await (const part of response.text) {
    summary += part;
  }

  return summary;
}

export async function commit(repository: Repository, message?: string) {
  // This function shouldn't ever be called when GitDoc
  // is disabled, but we're checking it just in case.
  if (store.enabled === false) return;

  const changes = [
    ...repository.state.workingTreeChanges,
    ...repository.state.mergeChanges,
    ...repository.state.indexChanges,
  ];

  if (changes.length === 0) return;

  const changedUris = changes
    .filter((change) => matches(change.uri))
    .map((change) => change.uri);

  if (changedUris.length === 0) return;

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

  let commitMessage = message || currentTime.toFormat(config.commitMessageFormat);

  if (config.aiEnabled) {
    const aiMessage = await generateCommitMessage(repository, changedUris);
    if (aiMessage) {
      commitMessage = aiMessage;
    }
  }

  await repository.commit(commitMessage, { all: true, noVerify: config.noVerify });

  delete process.env.GIT_AUTHOR_DATE;
  delete process.env.GIT_COMMITTER_DATE;

  if (config.autoPush === "onCommit") {
    await pushRepository(repository);
  }

  if (config.autoPull === "onCommit") {
    await pullRepository(repository);
  }
}

// TODO: Clear the timeout when GitDoc is disabled.
function debounce(fn: Function, delay: number) {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const commitMap = new Map();
function debouncedCommit(repository: Repository) {
  if (!commitMap.has(repository)) {
    commitMap.set(
      repository,
      debounce(() => commit(repository), config.autoCommitDelay)
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

  if (config.autoPull === "afterDelay") {
    const interval = setInterval(
      async () => pullRepository(git.repositories[0]),
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
    pullRepository(git.repositories[0]);
  }

  return {
    dispose: () => {
      disposables.forEach((disposable) => disposable.dispose());
      disposables = [];
    },
  };
}
