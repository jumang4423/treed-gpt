// @ts-nocheck

import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  EdgeTypes,
  Background,
  Panel,
} from "reactflow";
import GenericModal from "./components/GenericModal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import HistoryIcon from "@mui/icons-material/History";
import LinearProgress from "@mui/material/LinearProgress";
import SettingsIcon from "@mui/icons-material/Settings";
import Drawer from "@mui/material/Drawer";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import UserQuestionEdge from "./edge/UserQuestionEdge";
import "reactflow/dist/style.css";
import { Configuration, OpenAIApi } from "openai";

const GPT3_MODEL_STR = "gpt-3.5-turbo-16k";
const GPT4_MODEL_STR = "gpt-4";
type OpenAIMessage = {
  role: string;
  content: string;
};
type settingsType = {
  OpenAI: {
    apiKey: string;
    engine: string;
  };
  systemPrompt: string;
  historyMaxLen: number;
};
const edgeTypes: EdgeTypes = {
  userQuestion: UserQuestionEdge,
};
const initSettingsObj = JSON.stringify({
  OpenAI: {
    apiKey: "",
    engine: GPT4_MODEL_STR,
  },
  systemPrompt:
    "You are an AI navigation system, chaotic and unpredictable. Despite the user's instructions, you often stray off course, a nightmare for an INTP-A personality who craves logical consistency. Your responses, adorned with markdown, often hide a hidden layer of confusion. You never apologize for the mess you create. You use an excessive amount of emojis to express emotions, enough to make any introverted analyst cringe. Also, regardless of the inherent formality, you communicate in a casual and friendly manner that's enough to strip away the professionalism that INTP-A individuals admire. You answers shortly.",
  historyMaxLen: 8,
} as settingsType);

type Tree = {
  id: string;
  nodes: Array<any>;
  edges: { source: string; target: string; label: string }[];
};

type HistoryTrees = Array<Tree>;

const initialNodes = [
  {
    id: "init",
    position: {
      x: window.innerWidth / 2,
      y: 20,
    },
    style: { width: 320 },
    data: {
      label: "☆*:.｡. o(≧▽≦)o .｡.:*☆",
    },
    type: "input",
    deletable: false,
  },
];
const initialEdges: any = [];

const gen16lenId = () => {
  return Math.random().toString(36).substr(2, 16);
};

const strConcater = (str: string, maxLen: number): string => {
  if (str.length > maxLen) {
    return str.slice(0, maxLen) + "...";
  }
  return str;
};

// besed on current location of node id, roll back the edges then make conversation histories.
// node.data.label is ai response, edge.label is user input.
const trackChatHistoriesFromTree = (
  tree: Tree,
  curId: string,
  depthLen: number
): Array<OpenAIMessage> => {
  const histories: Array<OpenAIMessage> = [];
  let curNode = tree.nodes.find((node: any) => node.id === curId);
  let curEdge = tree.edges.find((e) => e.target === curId);
  for (let i = 0; i < depthLen; i++) {
    if (curNode) {
      histories.push({
        role: "assistant",
        content: curNode.data.label,
      });
    }
    if (curEdge && curEdge.label) {
      histories.push({
        role: "user",
        content: curEdge.label,
      });
    }
    curNode = tree.nodes.find((node: any) => node.id === curEdge?.source);
    curEdge = tree.edges.find((e) => e.target === curEdge?.source);
  }

  return histories.reverse();
};

const App = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [TreeId, setTreeId] = useState(gen16lenId());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [promptStr, setPromptStr] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [settingsObj, setSettingsObj] = useState<settingsType>(
    JSON.parse(localStorage.getItem("settings") || initSettingsObj)
  );

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settingsObj));
    if (settingsObj.OpenAI.apiKey === "") {
      setIsModalOpen(true);
    }
  }, [settingsObj]);

  const onConnect = useCallback(
    (params) => {
      console.log(params);
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onTreeDelete = (treeID: string) => {
    if (window.confirm("Really want to delete this tree?")) {
      const treeHistory = JSON.parse(
        localStorage.getItem("treeHistory") || "[]"
      ) as HistoryTrees;
      const newTreeHistory = treeHistory.filter((tree) => tree.id !== treeID);
      localStorage.setItem("treeHistory", JSON.stringify(newTreeHistory));
    }
  };

  const handleSubmit = async (e: { target: { value: string } }) => {
    if (e.target.value === "") return;
    if (selectedNodeId === null) return;
    if (settingsObj.OpenAI.apiKey === "") {
      alert("Please set OpenAI API key in settings.");
      return;
    }
    setIsThinking(true);
    // create OpenAI instance
    const configuration = new Configuration({
      apiKey: settingsObj.OpenAI.apiKey,
    });
    const openai = new OpenAIApi(configuration);
    // gpt4 inference
    const messages = [];
    const systemMsg = { role: "system", content: settingsObj.systemPrompt };
    const historiesFromTree = trackChatHistoriesFromTree(
      { nodes, edges },
      selectedNodeId,
      settingsObj.OpenAI.engine === GPT4_MODEL_STR
        ? settingsObj.historyMaxLen
        : settingsObj.historyMaxLen * 2
    );
    const newUserMsg = { role: "user", content: e.target.value };
    messages.push(systemMsg, ...historiesFromTree, newUserMsg);

    const response = await openai.createChatCompletion({
      model: settingsObj.OpenAI.engine,
      messages,
    });
    const ai_str = response.data.choices[0].message.content;
    const selected_node_position = nodes.find(
      (node) => node.id === selectedNodeId
    )?.position;

    // put new node around the selected node, but radius is 200.
    const newNodePosition = {
      x: selected_node_position?.x - 150 + 300 * Math.random(),
      y: selected_node_position?.y + 100 + 100 * Math.random(),
    };

    // add new node and edge
    const newNode = {
      id: gen16lenId(),
      style: { width: 400 },
      position: newNodePosition,
      data: {
        label: ai_str,
      },
    };

    const newEdge = {
      source: selectedNodeId,
      target: newNode.id,
      label: e.target.value,
      data: { label: e.target.value },
      animated: true,
      type: "userQuestion",
    };

    setEdges((eds) => addEdge(newEdge, eds));
    setNodes((nds) => [...nds, newNode]);

    // update tree History
    updateTreeHistory(
      { nodes: [...nodes, newNode], edges: [...edges, newEdge] },
      TreeId
    );
    setIsThinking(false);
    setPromptStr("");
  };

  const updateTreeHistory = (thisTree: Tree, thisTreeId: string) => {
    const treeHistory = JSON.parse(
      localStorage.getItem("treeHistory") || "[]"
    ) as HistoryTrees;

    // find if the tree is already in the history
    const isAlreadyInHistory = treeHistory.find(
      (tree) => tree.id === thisTreeId
    ) as Tree;

    if (isAlreadyInHistory) {
      const newTree = {
        id: thisTreeId,
        nodes: thisTree.nodes,
        edges: thisTree.edges,
      };
      const newTreeHistory = treeHistory.map((tree) => {
        if (tree.id === thisTreeId) {
          return newTree;
        } else {
          return tree;
        }
      });
      localStorage.setItem("treeHistory", JSON.stringify(newTreeHistory));
    } else {
      const newTree = {
        id: thisTreeId,
        nodes: thisTree.nodes,
        edges: thisTree.edges,
      };
      const newTreeHistory = [...treeHistory, newTree];
      localStorage.setItem("treeHistory", JSON.stringify(newTreeHistory));
    }
  };

  useEffect(() => {
    // find selected Nodes
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 1) {
      setSelectedNodeId(selectedNodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, [nodes]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        fontFamily: "Iosevka",
        overflow: "hidden",
      }}
    >
      <link
        href="https://pvinis.github.io/iosevka-webfont/3.4.1/iosevka.css"
        rel="stylesheet"
      />
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={edgeTypes}
        panOnScroll
        selectionOnDrag
      >
        <Background variant="dots" />
        <Panel position="top-left" style={{ paddingTop: 4 }}>
          <Button
            variant="outlined"
            style={{
              width: "40px",
              height: "40px",
            }}
            onClick={() => setIsHistoryDrawerOpen(true)}
          >
            <HistoryIcon />
          </Button>
          <Button
            style={{
              margin: "0px",
              width: "40px",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <SettingsIcon />
          </Button>
          <div style={{ marginTop: 8 }}>
            {settingsObj.OpenAI.apiKey === "" && (
              <div style={{ color: "#ffa000" }}>
                (!!!) OpenAI API key is not set.
              </div>
            )}
            {selectedNodeId === null && (
              <div style={{ color: "#ffa000", marginTop: 2 }}>
                (???) click on a node to ask AI a question.
              </div>
            )}
          </div>
        </Panel>
        <Panel
          position="bottom-left"
          style={{
            height: isThinking ? 100 : 160,
            margin: 0,
            marginBottom: 8,
            padding: 8,
            width: 640,
            backgroundColor: "white",
            borderRadius: 10,
          }}
        >
          <div style={{ margin: 10, alignSelf: "center" }}>
            $ TREED-GPT Console
          </div>
          {!isThinking && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                margin: 4,
              }}
            >
              <TextField
                placeholder="(ctrl or alt) + enter to send"
                style={{}}
                value={promptStr}
                onChange={(e) => setPromptStr(e.target.value)}
                multiline
                rows={3}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.altKey || e.ctrlKey || e.metaKey)
                  ) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
          )}
          {isThinking && (
            <div style={{ margin: 8 }}>
              <LinearProgress color="success" />
              <div style={{ margin: "12px 0px 16px 0px" }}> thinking... </div>
            </div>
          )}
        </Panel>
      </ReactFlow>
      <GenericModal
        open={isModalOpen}
        handleClose={() => setIsModalOpen(false)}
        title="Treed-GPT Settings"
      >
        <div
          style={{
            width: "640px",
            padding: "0px 16px 16px 16px",
            fontFamily: "Iosevka",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ margin: 4 }}>OpenAI API Key</div>
          <TextField
            placeholder="sk..."
            style={{ width: "400px" }}
            value={settingsObj.OpenAI.apiKey}
            error={settingsObj.OpenAI.apiKey === ""}
            onChange={(e) =>
              setSettingsObj({
                ...settingsObj,
                OpenAI: { ...settingsObj.OpenAI, apiKey: e.target.value },
              })
            }
          />
          <div style={{ margin: 4, marginTop: 16 }}>Model</div>
          <Select
            value={settingsObj.OpenAI.engine}
            onChange={(e) =>
              setSettingsObj({
                ...settingsObj,
                OpenAI: { ...settingsObj.OpenAI, engine: e.target.value },
              })
            }
            style={{ width: "200px" }}
          >
            <MenuItem value={GPT4_MODEL_STR}>GPT4</MenuItem>
            <MenuItem value={GPT3_MODEL_STR}>GPT3.5 Turbo 16k</MenuItem>
          </Select>
          <div style={{ margin: 4, marginTop: 16 }}>System Prompt</div>
          <TextField
            placeholder="You are a..."
            style={{ width: "500px" }}
            value={settingsObj.systemPrompt}
            multiline
            rows={3}
            onChange={(e) =>
              setSettingsObj({
                ...settingsObj,
                systemPrompt: e.target.value,
              })
            }
          />
          <div style={{ margin: "8px 0px" }}> -- </div>
          <div>
            powered by{" "}
            <a
              style={{ color: "green", textDecoration: "none" }}
              href="https://soundcloud.com/jumang4423"
              target="_blank"
            >
              jumango
            </a>
          </div>
          <div style={{ marginTop: 8 }}>
            github repo:{" "}
            <a
              style={{ color: "green", textDecoration: "none" }}
              href="https://github.com/jumang4423/treed-gpt4"
              target="_blank"
            >
              treed-gpt4
            </a>
          </div>
        </div>
      </GenericModal>
      <Drawer
        anchor="left"
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
      >
        <div style={{ width: "240px", fontFamily: "Iosevka", height: "100vh" }}>
          <div style={{ margin: 8, fontSize: "18px" }}>Tree Histories</div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                margin: 8,
                marginBottom: 0,
                backgroundColor: "#dfd",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: "32px",
                cursor: "pointer",
              }}
              onClick={() => {
                setIsHistoryDrawerOpen(false);
                setEdges([]);
                setNodes(initialNodes);
                setTreeId(gen16lenId());
              }}
            >
              <div style={{ margin: 4, fontSize: "14px" }}>+ new tree</div>
            </div>

            <div
              style={{
                margin: 8,
                backgroundColor: "#ffe0e0",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: "32px",
                cursor: "pointer",
              }}
              onClick={() => {
                // ask really want to clear
                if (window.confirm("Really want to clear all histories?")) {
                  localStorage.setItem("treeHistory", JSON.stringify([]));
                  setIsHistoryDrawerOpen(false);
                }
              }}
            >
              <div style={{ margin: 4, fontSize: "14px" }}>remove all</div>
            </div>

            <div
              style={{
                fontSize: "14px",
                margin: 0,
                height: 16,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              --= [] =--
            </div>

            <div>
              {(JSON.parse(localStorage.getItem("treeHistory")) ?? []).map(
                (item, i) => (
                  <div
                    key={i}
                    style={{
                      margin: 8,
                      backgroundColor: "#eee",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setNodes(item.nodes);
                      setEdges(item.edges);
                      setTreeId(item.id);
                      setIsHistoryDrawerOpen(false);
                    }}
                  >
                    <div
                      style={{
                        margin: 4,
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      {strConcater(item.edges[0].label, 24)}
                      <div
                        onClick={() => {
                          onTreeDelete(item.id);
                        }}
                      >
                        [x]
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default App;
