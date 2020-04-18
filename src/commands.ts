import * as vscode from "vscode";
import { EXTENSION_NAME } from "./constants";
import { updateContext } from "./store/actions";
import { getGitApi } from "./git";
import { commit } from "./watcher";

export function registerCommands(context: vscode.ExtensionContext) {
  function registerCommand(name: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`${EXTENSION_NAME}.${name}`, callback)
    );
  }

  registerCommand("enable", updateContext.bind(null, true));
  registerCommand("enableBranch", updateContext.bind(null, true, true));
  registerCommand("disable", updateContext.bind(null, false));
  registerCommand("disableBranch", updateContext.bind(null, false, true));

  registerCommand("restoreVersion", async (item: any) => {
    if (!vscode.window.activeTextEditor) {
      return;
    }

    const path = vscode.workspace.asRelativePath(
      vscode.window.activeTextEditor.document.uri.path
    );

    const git = await getGitApi();
    // @ts-ignore
    await git?.repositories[0]._repository.repository.checkout(item.ref, [
      path,
    ]);

    // TODO: Look into why the checkout
    // doesn't trigger the watcher.
    commit(git?.repositories[0]!);
  });

  registerCommand("collapseVersions", async (item: any) => {
    const message = await vscode.window.showInputBox({
      prompt: "Enter the name to give to the collapsed version",
      value: item.message,
    });

    if (message) {
      const git = await getGitApi();
      // @ts-ignore
      await git?.repositories[0]._repository.reset(`${item.ref}~1`);
      await git?.repositories[0].commit(message);
    }
  });
}
