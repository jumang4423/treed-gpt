import { atom } from "recoil";
import { User } from "../helpers/user";

export const UserState = atom({
  key: "UserState",
  default: {
    group_ids: [],
  } as User,
});
