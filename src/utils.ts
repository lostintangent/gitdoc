import * as vscode from "vscode";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { store } from "./store";

export const ENABLED_KEY = `${EXTENSION_NAME}:enabled`;
export const BRANCH_ENABLED_KEY = `${EXTENSION_NAME}:branchEnabled`;

function setContext(key: string, value: any): void {
  vscode.commands.executeCommand("setContext", key, value);
}

function setEnabledContext(enabled: boolean) {
  setContext(ENABLED_KEY, enabled);
}

export function setBranchEnabledContext(enabled: boolean) {
  setContext(BRANCH_ENABLED_KEY, enabled);
}

export function updateContext(enabled: boolean, forBranch: boolean = false) {
  store.enabled = enabled;
  setEnabledContext(enabled);

  if (forBranch) {
    config.enabled = enabled;
    setBranchEnabledContext(enabled);
  }
}
