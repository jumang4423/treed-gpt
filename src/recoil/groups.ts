import { atom } from "recoil";
import { Group } from "../helpers/user";

export const GroupsState = atom({
  key: "GroupsState",
  default: {} as Record<string, Group>,
});
