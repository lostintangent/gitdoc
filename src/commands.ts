import * as vscode from "vscode";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { store } from "./store";

const ENABLED_KEY = `${EXTENSION_NAME}:enabled`;
const BRANCH_ENABLED_KEY = `${EXTENSION_NAME}:branchEnabled`;

function enable(forBranch = false) {
  store.enabled = true;
  vscode.commands.executeCommand("setContext", ENABLED_KEY, true);

  if (forBranch) {
    config.enabled = true;
    vscode.commands.executeCommand("setContext", BRANCH_ENABLED_KEY, true);
  }
}

function disable(forBranch: boolean = false) {
  store.enabled = false;

  vscode.commands.executeCommand("setContext", ENABLED_KEY, false);

  if (forBranch) {
    config.enabled = false;
    vscode.commands.executeCommand("setContext", BRANCH_ENABLED_KEY, false);
  }
}

export function registerCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_NAME}.enable`, enable)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.enableBranch`,
      enable.bind(null, true)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_NAME}.disable`, disable)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.disableBranch`,
      disable.bind(null, true)
    )
  );
}
