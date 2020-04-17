import config from "../config";
import { setBranchEnabledContext, setEnabledContext } from "../utils";
import { store } from "./store";

export function updateContext(enabled: boolean, forBranch: boolean = false) {
  store.enabled = enabled;
  setEnabledContext(enabled);

  if (forBranch) {
    config.enabled = enabled;
    setBranchEnabledContext(enabled);
  }
}
