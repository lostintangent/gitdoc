import * as vscode from "vscode";

const ENABLED_KEY = "enabled";

export type AutoPush = "onSave" | "afterDelay" | "off";

function config() {
  return vscode.workspace.getConfiguration("gitdoc");
}

export default {
  get autoPush(): AutoPush {
    return config().get("autoPush", "off");
  },
  get autoPushDelay(): number {
    return config().get("autoPushDelay", 30000);
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
};
