// @ts-nocheck

import { useCallback, useEffect, useState } from "react";
import { GroupsState } from "./recoil/groups";
import { useRecoilValue } from "recoil";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Panel,
  MiniMap,
} from "reactflow";
import HistoryViewer from "./components/HistoryViewer/HistoryViewer";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import HistoryIcon from "@mui/icons-material/History";
import LinearProgress from "@mui/material/LinearProgress";
import SettingsIcon from "@mui/icons-material/Settings";
import UserQuestionEdge from "./edge/UserQuestionEdge";
import "reactflow/dist/style.css";
import { Configuration, OpenAIApi } from "openai";
import { Gen16lenId } from "./helpers/genId";
import { OpenAIMessage, GPT4_MODEL_STR } from "./helpers/openai";
import { Tree, HistoryTrees } from "./helpers/tree";
import {
  SettingsType,
  InitSettingsObj,
  InitialNodes,
  InitialEdges,
} from "./helpers/inits";
import SettingModal from "./components/SettingModal";
import NewGroupModal from "./components/NewGroupModal";
import { Db } from "./helpers/firebase";
import { ref, get, onValue, set } from "firebase/database";
import { Tsunami } from "@mui/icons-material";
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
    if (curEdge) {
      histories.push({
        role: "user",
        content: curEdge.label || "ignore this user message.",
      });
    }
    curNode = tree.nodes.find((node: any) => node.id === curEdge?.source);
    curEdge = tree.edges.find((e) => e.target === curEdge?.source);
  }

  return histories.reverse();
};

const onCleanTree = (treeD: Tree): Tree => {
  const nodes = treeD.nodes;
  // remove selected field from nodes
  const newNodes = nodes.map((node: any) => {
    const newNode = structuredClone(node);
    delete newNode.selected;
    return newNode;
  });

  return {
    id: treeD.id,
    nodes: newNodes,
    edges: treeD.edges,
  };
};

const onArcTree = (tree: Tree, selectedNodeId: string): Tree => {
  const treeD = structuredClone(tree);
  const nodes = treeD.nodes || [];
  const newNodes = nodes.map((node) => {
    const newNode = structuredClone(node);
    newNode.selected = newNode.id === selectedNodeId;
    return newNode;
  });

  return {
    id: treeD.id,
    nodes: newNodes,
    edges: treeD.edges || [],
  };
};

const App = () => {
  // modals
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  // local states
  const [GroupId, setGroupId] = useState<string | undefined>(undefined);
  const [TreeId, setTreeId] = useState<string | undefined>(undefined);
  const [nodes, setNodes, onNodesChange] = useNodesState(InitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(InitialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // ui state
  const [promptStr, setPromptStr] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [settingsObj, setSettingsObj] = useState<SettingsType>(
    JSON.parse(localStorage.getItem("settings") || InitSettingsObj)
  );
  // recoild state
  const groupsState = useRecoilValue(GroupsState);

  const onConnect = useCallback(
    (params: any) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onUpdateTreeDiff = async () => {
    const cleanedTree = onCleanTree({ id: TreeId, nodes, edges });
    const treeRef = ref(Db, `groups/${GroupId}/trees/`);
    const treeSnap = await get(treeRef);
    const trees = structuredClone(treeSnap.val());
    const newTrees = trees.map((tree: any) => {
      if (tree.id === TreeId) {
        return cleanedTree;
      } else {
        return tree;
      }
    });
    set(treeRef, newTrees);
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
    try {
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
        id: Gen16lenId(),
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

      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds);
        return newEdges;
      });
      setNodes((nds) => [...nds, newNode]);
    } catch (e) {
      alert(e);
      setIsThinking(false);
      return;
    }

    setIsThinking(false);
    setPromptStr("");
  };

  useEffect(() => {
    if (!TreeId) return;
    // find selected Nodes
    const selectedNodes = nodes.filter((n) => n.selected);
    if (selectedNodes.length === 1) {
      setSelectedNodeId(selectedNodes[0].id);
    } else {
      setSelectedNodeId(null);
    }

    // update the tree diff
    onUpdateTreeDiff();
  }, [nodes]);

  // if login user is not set, open login screen
  useEffect(() => {
    if (localStorage.getItem("uid") === null) {
      window.location.reload();
    }
  }, [localStorage.getItem("uid")]);

  // this will be triggered when GroupId or TreeId, or someone changed the tree.
  useEffect(() => {
    if (!GroupId || !TreeId) return;
    // hope so
    const watchingTree: Tree = groupsState[GroupId].trees.find(
      (tree) => tree.id === TreeId
    ) as Tree;
    // with selected field
    const arcTree = onArcTree(watchingTree, selectedNodeId || "");
    setEdges(arcTree.edges);
    setNodes(arcTree.nodes);
  }, [groupsState, GroupId, TreeId]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        fontFamily: "Iosevka",
        overflow: "hidden",
      }}
    >
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={{
          userQuestion: UserQuestionEdge,
        }}
        panOnScroll
        selectionOnDrag
      >
        <Background variant="dots" />
        <MiniMap />
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
            onClick={() => setIsSettingModalOpen(true)}
          >
            <SettingsIcon />
          </Button>
          <div style={{ marginTop: 8 }}>
            {settingsObj.OpenAI.apiKey === "" && (
              <div style={{ color: "#ffa000" }}>
                (!) OpenAI API key is not set.
              </div>
            )}
            {!TreeId && (
              <div style={{ color: "#ffa000" }}>
                (?) Please select a tree from history.
              </div>
            )}
            {selectedNodeId === null && TreeId && (
              <div style={{ color: "#ffa000", marginTop: 2 }}>
                (?) click on a node to ask AI a question.
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
          hidden={!TreeId}
        >
          <div style={{ margin: 10, alignSelf: "center" }}>
            $ treed-gpt console
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
      <SettingModal
        open={isSettingModalOpen}
        onClose={() => setIsSettingModalOpen(false)}
        settingsObj={settingsObj}
        setSettingsObj={setSettingsObj}
        setIsModalOpen={setIsSettingModalOpen}
      />
      <NewGroupModal
        open={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
      />
      <HistoryViewer
        open={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        setTreeId={setTreeId}
        setGroupId={setGroupId}
        onOpenNewGroupModal={() => setIsNewGroupModalOpen(true)}
      />
    </div>
  );
};

export default App;
