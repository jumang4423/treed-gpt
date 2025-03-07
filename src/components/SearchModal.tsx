import { useState, useCallback } from "react";
import GenericModal from "./GenericModal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { Db } from "../helpers/firebase";
import { ref, get, onValue, set } from "firebase/database";
// @ts-ignore
import { OpenAI } from "openai";
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
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const onSearch = async () => {
    try {
      setIsLoading(true);

      // Get settings from localStorage
      const settingsObj = JSON.parse(localStorage.getItem("settings") || "{}");
      if (!settingsObj?.OpenAI?.apiKey) {
        alert("Please set your OpenAI API key in settings");
        setIsLoading(false);
        return;
      }

      // @ts-ignore
      const openaiClient = new OpenAI({
        apiKey: settingsObj.OpenAI.apiKey,
        dangerouslyAllowBrowser: true,
      });

      // get all nodes embedding
      const embs = [];
      for (const node of treeNodes) {
        const node_id = node.id;
        // check if embedding exists in local storage
        const embCache = localStorage.getItem(`${treeId}-${node_id}`);
        if (embCache) {
          // from cache
          embs.push({
            id: node_id,
            embedding: JSON.parse(embCache),
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
      const result = await openaiClient.embeddings.create({
        input: searchQuery,
        model: EMBEDDING_MODEL_STR,
      });
      const embedding = result.data[0].embedding;

      // calculate similarity scores
      const similarities = [];
      for (const emb of embs) {
        const similarity = cosineSimilarity(embedding, emb.embedding);
        similarities.push({
          id: emb.id,
          similarity,
        });
      }

      // sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);

      // get top 3 results
      const topResults = similarities.slice(0, 3);

      // find nodes
      const resultNodes = [];
      for (const result of topResults) {
        const node = treeNodes.find((n: any) => n.id === result.id);
        if (node) {
          resultNodes.push(node);
        }
      }

      setSearchResults(resultNodes);
      setIsLoading(false);
    } catch (error) {
      console.error("Error in search:", error);
      setIsLoading(false);
    }
  };

  return (
    <GenericModal open={open} handleClose={onClose} title="search">
      <div
        style={{
          width: "640px",
          padding: "0px 16px 32px 16px",
          fontFamily: "Iosevka",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <TextField
            placeholder="search query"
            style={{ width: "400px", marginRight: "16px" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch();
              }
            }}
          />
          <Button variant="outlined" onClick={onSearch} disabled={isLoading}>
            Search
          </Button>
        </div>

        {isLoading && <LinearProgress style={{ marginTop: "16px" }} />}

        {searchResults.length > 0 && !isLoading && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
              Results:
            </div>
            {searchResults.map((result, index) => (
              <div
                key={result.id}
                style={{
                  padding: "8px",
                  marginBottom: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  // Navigate to the selected node
                  const nodeWidth = result.style.width || 0;
                  setCenter(
                    result.position.x + nodeWidth / 2,
                    result.position.y + 10,
                    {
                      duration: 500,
                      zoom: 2,
                    }
                  );
                  setSelectNodeId(result.id);
                  setSearchQuery("");
                  onClose();
                }}
              >
                <div style={{ fontWeight: "bold" }}>#{index + 1}</div>
                <div>{result.data.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GenericModal>
  );
};

export default SearchModal;
