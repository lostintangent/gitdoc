import { ENABLED_KEY, BRANCH_ENABLED_KEY } from "./constants";
import * as vscode from "vscode";

function setContext(key: string, value: any): void {
  vscode.commands.executeCommand("setContext", key, value);
}

export function setEnabledContext(enabled: boolean) {
  setContext(ENABLED_KEY, enabled);
}

export function setBranchEnabledContext(enabled: boolean) {
  setContext(BRANCH_ENABLED_KEY, enabled);
}
