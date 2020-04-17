import { observable } from "mobx";

export const store = observable({
  enabled: false,
  isPushing: false,
});
