import * as vscode from "vscode";

const DEFAULT_DELAY_MS = 30000;
const ENABLED_KEY = "enabled";

export type AutoPull = AutoPush | "onPush";
export type AutoPush = "onCommit" | "afterDelay" | "off";
export type CommitValidationLevel = "error" | "warning" | "none";
export type PushMode = "forcePush" | "forcePushWithLease" | "push";

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
  get excludeBranches(): string[] {
    return config().get("excludeBranches", []);
  },
  get filePattern() {
    return config().get("filePattern", "**/*");
  },
  get noVerify(): boolean {
    return config().get("noVerify", false);
  },
  get pullOnOpen() {
    return config().get("pullOnOpen", true);
  },
  get pushMode(): PushMode {
    return config().get("pushMode", "forcePush");
  },
  get timeZone(): string | null {
    return config().get("timeZone", null);
  },
  get aiEnabled() {
    return config().get("ai.enabled", false);
  },
  get aiModel() {
    return config().get("ai.model", "gpt-4o");
  },
  get aiCustomInstructions() {
    return config().get("ai.customInstructions", null);
  },
  get aiUseEmojis() {
    return config().get("ai.useEmojis", false);
  }
};
