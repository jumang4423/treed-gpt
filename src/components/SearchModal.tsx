import { useState, useCallback } from "react";
import { Configuration, OpenAIApi } from "openai";
import { Tree } from "../helpers/tree";
import GenericModal from "./GenericModal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Db } from "../helpers/firebase";
import { ref, get, onValue, set } from "firebase/database";
import { EMBEDDING_MODEL_STR } from "../helpers/openai";

interface Props {
  open: boolean;
  onClose: () => void;
  treeId: string;
  treeNodes: any;
  setSelectNodeId: (id: string) => void;
  setCenter: any;
}

const dotProduct = (vecA: Array<number>, vecB: Array<number>) => {
  return vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
};

const magnitude = (vec: Array<number>) => {
  return Math.sqrt(vec.reduce((acc, val) => acc + Math.pow(val, 2), 0));
};

const cosineSimilarity = (vecA: Array<number>, vecB: Array<number>) => {
  return dotProduct(vecA, vecB) / (magnitude(vecA) * magnitude(vecB));
};

const SearchModal = ({
  open,
  onClose,
  treeId,
  treeNodes,
  setSelectNodeId,
  setCenter,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSearch = async () => {
    setIsLoading(true);
    // create OpenAI instance
    const settingsObj = JSON.parse(localStorage.getItem("settings") || "{}");
    if (settingsObj === null) {
      alert("please set your OpenAI API key in settings");
      return;
    }
    const configuration = new Configuration({
      apiKey: settingsObj.OpenAI!.apiKey!,
    });
    const openaiObj = new OpenAIApi(configuration);

    // get all nodes embedding
    const embs: { id: string; embedding: Array<number> }[] = [];
    for (const node of treeNodes) {
      const node_id = node.id;
      const emb = localStorage.getItem(`${treeId}-${node_id}`);
      if (emb) {
        // from cache
        embs.push({
          id: node_id,
          embedding: JSON.parse(emb),
        });
      } else {
        // from db
        const embRef = ref(Db, `embeddings/${treeId}/${node_id}`);
        const embSnap = await get(embRef);
        const embVal = embSnap.val();
        if (embVal) {
          embs.push({
            id: node_id,
            embedding: embVal,
          });
        }
      }
    }
    // get query embedding
    const result = await openaiObj.createEmbedding({
      input: searchQuery,
      model: EMBEDDING_MODEL_STR,
    });
    const embedding: Array<number> = result.data.data[0].embedding;
    const treeEmbsRef = ref(Db, `embeddings/${treeId}`);
    const treeEmbsSnap = await get(treeEmbsRef);
    const treeEmbs = structuredClone(treeEmbsSnap.val());
    if (!treeEmbs) {
      return null;
    }
    const treeEmbsArr = Object.entries(treeEmbs);
    const similarities = treeEmbsArr.map(([node_id, emb]: any) => {
      return {
        id: node_id,
        similarity: cosineSimilarity(emb, embedding),
      };
    });
    const sortedSimilarities = similarities.sort((a, b) => {
      return b.similarity - a.similarity;
    });
    const mostSimilar = sortedSimilarities[0];

    // get position of most similar node
    const similarNode = treeNodes.find(
      (node: any) => node.id === mostSimilar.id
    );
    const nodeWidth = similarNode!.style.width;
    setCenter(
      similarNode!.position.x + nodeWidth / 2,
      similarNode!.position.y + 10,
      {
        duration: 500,
        zoom: 2,
      }
    );
    setSelectNodeId(mostSimilar.id);
    setSearchQuery("");
    setIsLoading(false);
    onClose();
  };

  return (
    <GenericModal
      open={open}
      handleClose={onClose}
      title="search node relative to query"
    >
      {isLoading && (
        <div style={{ width: "570px", margin: 16 }}>loading...</div>
      )}
      {!isLoading && (
        <div
          style={{
            width: "640px",
            padding: "0px 16px 32px 16px",
            fontFamily: "Iosevka",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ margin: 4 }}>search query</div>
          <TextField
            placeholder="ex: why is the sky blue?"
            style={{ width: "570px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Button
            style={{ width: "570px", marginTop: 16 }}
            variant="outlined"
            onClick={() => {
              if (searchQuery.length > 0) {
                onSearch();
              } else {
                alert("please enter a search query");
              }
            }}
          >
            search
          </Button>
        </div>
      )}
    </GenericModal>
  );
};

export default SearchModal;
