// @ts-nocheck

import { useCallback, useEffect, useState } from "react";
import { GroupsState } from "./recoil/groups";
import { useRecoilValue } from "recoil";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  useReactFlow,
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
import SearchIcon from "@mui/icons-material/Search";
import UserQuestionEdge from "./edge/UserQuestionEdge";
import "reactflow/dist/style.css";
import { OpenAI } from "openai";
import { Gen16lenId } from "./helpers/genId";
import {
  OpenAIMessage,
  EMBEDDING_MODEL_STR,
  GPT4O_MODEL_STR,
} from "./helpers/openai";
import { Tree } from "./helpers/tree";
import {
  SettingsType,
  InitSettingsObj,
  InitialNodes,
  InitialEdges,
} from "./helpers/inits";
import SettingModal from "./components/SettingModal";
import NewGroupModal from "./components/NewGroupModal";
import SearchModal from "./components/SearchModal";
import { Db } from "./helpers/firebase";
import { ref, get, set } from "firebase/database";
import UploadImgButton from "./components/UploadImgButton";
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
      const contentArr = [];
      console.log(curEdge);
      if (curEdge.data?.image_url) {
        contentArr.push({
          type: "image_url",
          image_url: {
            url: curEdge.data?.image_url,
            detail: "low",
          },
        });
      }
      contentArr.push({
        type: "text",
        text: curEdge.label || "uh huh.",
      });
      histories.push({
        role: "assistant",
        content: contentArr,
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

// add embedding to realtime db
const addEmbedding = async (
  treeId: string,
  node_id: string,
  content: string,
  openaiClient
) => {
  try {
    const result = await openaiClient.embeddings.create({
      input: content,
      model: EMBEDDING_MODEL_STR,
    });
    const embedding = result.data[0].embedding;
    const treeEmbsRef = ref(Db, `embeddings/${treeId}/${node_id}`);
    await set(treeEmbsRef, embedding);

    // cache to local storage
    localStorage.setItem(`${treeId}-${node_id}`, JSON.stringify(embedding));
  } catch (error) {
    console.error("Error creating embedding:", error);
  }
};

const App = () => {
  // modals
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  // local states
  const [GroupId, setGroupId] = useState<string | undefined>(undefined);
  const [TreeId, setTreeId] = useState<string | undefined>(undefined);
  const [nodes, setNodes, onNodesChange] = useNodesState(InitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(InitialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [img_url, setImgUrl] = useState<string | null>(null);
  // ui state
  const [promptStr, setPromptStr] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [settingsObj, setSettingsObj] = useState<SettingsType>(
    JSON.parse(localStorage.getItem("settings") || InitSettingsObj)
  );
  const { setCenter } = useReactFlow();
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
    if (selectedNodeId === null) {
      alert("select on a node to ask AI a question.");
      return;
    }
    if (settingsObj.OpenAI.apiKey === "") {
      alert("Please set OpenAI API key in settings.");
      return;
    }
    setIsThinking(true);

    try {
      // @ts-ignore
      const openaiClient = new OpenAI({
        apiKey: settingsObj.OpenAI.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // gpt4 inference
      const messages = [];
      const systemMsg = { role: "system", content: settingsObj.systemPrompt };
      const historiesFromTree = trackChatHistoriesFromTree(
        { nodes, edges },
        selectedNodeId,
        settingsObj.historyMaxLen
      );
      const newUserMsg = { role: "user", content: [] };
      if (img_url) {
        newUserMsg.content.push({
          type: "image_url",
          image_url: {
            url: img_url,
            detail: "low",
          },
        });
      }
      newUserMsg.content.push({
        type: "text",
        text: e.target.value,
      });
      messages.push(systemMsg, ...historiesFromTree, newUserMsg);

      const response = await openaiClient.chat.completions.create({
        model: settingsObj.OpenAI.engine,
        messages,
        max_tokens: 4096,
      });

      const ai_str = response.choices[0].message.content;
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
        data: {
          label: e.target.value,
        },
        animated: true,
        type: "userQuestion",
      };
      // if img_url is set, add it to the edge
      if (img_url) {
        newEdge.data.image_url = img_url;
      }

      // subscribe embedding
      await addEmbedding(TreeId, newNode.id, ai_str, openaiClient);

      // update state
      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds);
        return newEdges;
      });
      setNodes((nds) => [...nds, newNode]);

      setIsThinking(false);
      setImgUrl(null);
      setPromptStr("");
    } catch (error) {
      console.error("Error submitting question:", error);
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (!TreeId || !GroupId) return;
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
    if (!GroupId || !TreeId) {
      setNodes(InitialNodes);
      setEdges(InitialEdges);
      return;
    }
    // hope so
    const watchingTree: Tree = groupsState?.[GroupId]?.trees?.find(
      (tree) => tree.id === TreeId
    );
    if (!watchingTree) {
      setNodes(InitialNodes);
      setEdges(InitialEdges);
      return;
    }

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
              width: "40px",
              marginLeft: "8px",
              height: "40px",
            }}
            onClick={() => setIsSearchModalOpen(true)}
          >
            <SearchIcon />
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
            marginBottom: 16,
            padding: 8,
            width: 640,
            backgroundColor: "white",
            borderRadius: 10,
          }}
          hidden={!TreeId}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              margin: 10,
              alignSelf: "center",
            }}
          >
            🌈 treed-gpt console
            <div
              style={{
                marginLeft: "16px",
                display: "flex",
              }}
            >
              <UploadImgButton imageUrl={img_url} setImgUrl={setImgUrl} />
            </div>
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
      <SearchModal
        open={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        treeId={TreeId}
        treeNodes={nodes}
        setSelectNodeId={setSelectedNodeId}
        setCenter={setCenter}
      />
    </div>
  );
};

export default App;
