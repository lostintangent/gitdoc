import * as vscode from "vscode";
import config from "./config";
import { EXTENSION_NAME } from "./constants";
import { store } from "./store";
import { getGitApi } from "./git";

const ENABLED_KEY = `${EXTENSION_NAME}:enabled`;

export async function checkGitUserConfig() {
  const gitApi = await getGitApi();
  if (!gitApi) {
    vscode.window.showErrorMessage("Git extension is not available.");
    return;
  }

  const repository = gitApi.repositories[0];
  if (!repository) {
    vscode.window.showErrorMessage("No Git repository found.");
    return;
  }

  const userName = await repository.getConfig("user.name");
  const userEmail = await repository.getConfig("user.email");

  if (!userName || !userEmail) {
    vscode.window.showWarningMessage("Git user.name and/or user.email are not configured. Please configure them to use GitDoc.");
  }
}

export function updateContext(enabled: boolean, updateConfig: boolean = true) {
  store.enabled = enabled;
  vscode.commands.executeCommand("setContext", ENABLED_KEY, enabled);

  if (updateConfig) {
    config.enabled = enabled;
  }
}
