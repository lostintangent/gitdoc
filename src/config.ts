import * as vscode from "vscode";

const DEFAULT_DELAY_MS = 30000;
const ENABLED_KEY = "enabled";

export type AutoPush = "onCommit" | "afterDelay" | "off";

function config() {
  return vscode.workspace.getConfiguration("gitdoc");
}

export default {
  get autoCommitDelay(): number {
    return config().get("autoCommitDelay", DEFAULT_DELAY_MS);
  },
  get autoPush(): AutoPush {
    return config().get("autoPush", "off");
  },
  get autoPushDelay(): number {
    return config().get("autoPushDelay", DEFAULT_DELAY_MS);
  },
  get commitMessageFormat(): string {
    return config().get("commitMessageFormat", "lll");
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
};
