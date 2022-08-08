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

    const path = vscode.workspace.asRelativePath(
      vscode.window.activeTextEditor.document.uri.path
    );

    const git = await getGitApi();

    // @ts-ignore
    await git?.repositories[0].repository.repository.checkout(item.ref, [
      path,
    ]);

    // TODO: Look into why the checkout
    // doesn't trigger the watcher.
    commit(git?.repositories[0]!);
  });

  registerCommand("squashVersions", async (item: GitTimelineItem) => {
    const message = await vscode.window.showInputBox({
      prompt: "Enter the name to give to the new squashed version",
      value: item.message,
    });

    if (message) {
      const git = await getGitApi();
      // @ts-ignore
      await git?.repositories[0].repository.reset(`${item.ref}~1`);
      await commit(git?.repositories[0]!, message);
    }
  });

  registerCommand("undoVersion", async (item: GitTimelineItem) => {
    const git = await getGitApi();

    // @ts-ignore
    await git?.repositories[0].repository.repository.run([
      "revert",
      "-n", // Tell Git not to create a commit, so that we can make one with the right message format
      item.ref,
    ]);

    await commit(git?.repositories[0]!);
  });
}
