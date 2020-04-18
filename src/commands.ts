import * as vscode from "vscode";
import { EXTENSION_NAME } from "./constants";
import { updateContext } from "./store/actions";

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

  registerCommand("squash", (item: any) => {
    console.log("GD: Item: %o", item.ref);
  });
}
