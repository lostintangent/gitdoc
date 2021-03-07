import * as vscode from "vscode";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { store } from "./store";

const ENABLED_KEY = `${EXTENSION_NAME}:enabled`;

export function updateContext(enabled: boolean) {
  store.enabled = enabled;
  config.enabled = enabled;
  vscode.commands.executeCommand("setContext", ENABLED_KEY, enabled);
}
