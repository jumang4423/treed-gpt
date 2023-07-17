import { HistoryTrees } from "./tree";

export interface User {
  displayName: string;
  group_ids: Array<string>;
}

export interface Group {
  name: string;
  trees: HistoryTrees;
  isUserGroup?: boolean;
}
