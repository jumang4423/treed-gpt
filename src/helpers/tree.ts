export type Tree = {
  id: string;
  nodes: Array<any>;
  edges: Array<{ source: string; target: string; label: string }>;
};

export type HistoryTrees = Array<Tree>;
