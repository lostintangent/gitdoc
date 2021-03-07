import * as vscode from "vscode";

const DEFAULT_DELAY_MS = 30000;
const ENABLED_KEY = "enabled";

export type AutoPull = AutoPush | "onPush";
export type AutoPush = "onCommit" | "afterDelay" | "off";
export type CommitValidationLevel = "error" | "warning" | "none";

function config() {
  return vscode.workspace.getConfiguration("gitdoc");
}

export default {
  get autoCommitDelay(): number {
    return config().get("autoCommitDelay", DEFAULT_DELAY_MS);
  },
  get autoPull(): AutoPull {
    return config().get("autoPull", "onPush");
  },
  get autoPullDelay(): number {
    return config().get("autoPullDelay", DEFAULT_DELAY_MS);
  },
  get autoPush(): AutoPush {
    return config().get("autoPush", "onCommit");
  },
  get autoPushDelay(): number {
    return config().get("autoPushDelay", DEFAULT_DELAY_MS);
  },
  get commitMessageFormat(): string {
    return config().get("commitMessageFormat", "lll");
  },
  get commitValidationLevel(): CommitValidationLevel {
    return config().get("commitValidationLevel", "error");
  },
  get commitOnClose() {
    return config().get("commitOnClose", true);
  },
  get enabled() {
    return config().get(ENABLED_KEY, false);
  },
  set enabled(value: boolean) {
    config().update(ENABLED_KEY, value, vscode.ConfigurationTarget.Workspace);
  },
  get filePattern() {
    return config().get("filePattern", "**/*");
  },
  get pullOnOpen() {
    return config().get("pullOnOpen", true);
  },
};
