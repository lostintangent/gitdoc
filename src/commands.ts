import * as vscode from "vscode";
import { EXTENSION_NAME } from "./constants";
import { getGitApi } from "./git";
import { updateContext } from "./utils";
import { commit } from "./watcher";

interface GitTimelineItem {
  message: string;
  ref: string;
  previousRef: string;
}

export function registerCommands(context: vscode.ExtensionContext) {
  function registerCommand(name: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`${EXTENSION_NAME}.${name}`, callback)
    );
  }

  registerCommand("enable", updateContext.bind(null, true));
  registerCommand("disable", updateContext.bind(null, false));

  registerCommand("restoreVersion", async (item: GitTimelineItem) => {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    const uri = vscode.window.activeTextEditor.document.uri;
    const path = vscode.workspace.asRelativePath(uri.path);

    const git = await getGitApi();
    const repository = git?.getRepository(uri);
    
    if (!repository) {
      vscode.window.showErrorMessage("No git repository found for this file");
      return;
    }

    // @ts-ignore
    await repository.repository.repository.checkout(item.ref, [path]);

    // TODO: Look into why the checkout
    // doesn't trigger the watcher.
    commit(repository);
  });

  registerCommand("squashVersions", async (item: GitTimelineItem) => {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    const message = await vscode.window.showInputBox({
      prompt: "Enter the name to give to the new squashed version",
      value: item.message,
    });

    if (message) {
      const git = await getGitApi();
      const repository = git?.getRepository(vscode.window.activeTextEditor.document.uri);
      
      if (!repository) {
        vscode.window.showErrorMessage("No git repository found for this file");
        return;
      }

      // @ts-ignore
      await repository.repository.reset(`${item.ref}~1`);
      await commit(repository, message);
    }
  });

  registerCommand("undoVersion", async (item: GitTimelineItem) => {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    const git = await getGitApi();
    const repository = git?.getRepository(vscode.window.activeTextEditor.document.uri);
    
    if (!repository) {
      vscode.window.showErrorMessage("No git repository found for this file");
      return;
    }

    // @ts-ignore
    await repository.repository.repository.run([
      "revert",
      "-n", // Tell Git not to create a commit, so that we can make one with the right message format
      item.ref,
    ]);

    await commit(repository);
  });

  registerCommand("commit", async () => {
    const git = await getGitApi();
    if (!git || git.repositories.length === 0) {
      return;
    }

    if (vscode.window.activeTextEditor) {
      // Commit the repository containing the active file
      const repository = git.getRepository(vscode.window.activeTextEditor.document.uri);
      if (repository) {
        await commit(repository);
        return;
      }
    }

    // Fallback: commit all repositories
    await Promise.all(git.repositories.map(repo => commit(repo)));
  });
}
