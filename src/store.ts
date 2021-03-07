import { observable } from "mobx";

export const store = observable({
  enabled: false,
  isPulling: false,
  isPushing: false,
});
