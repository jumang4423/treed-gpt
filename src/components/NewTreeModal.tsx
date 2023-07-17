import { useState } from "react";
import { Tree } from "../helpers/tree";
import GenericModal from "./GenericModal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { ref, set } from "firebase/database";
import { Db } from "../helpers/firebase";
import { Gen16lenId } from "../helpers/genId";
import { GenInitialNodes, GenInitialEdges } from "../helpers/inits";
import { GroupsState } from "../recoil/groups";
import { useRecoilValue } from "recoil";
interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

const NewTreeModal = ({ open, onClose, groupId }: Props) => {
  const [treeTitle, setTreeTitle] = useState("");
  const groups = useRecoilValue(GroupsState);
  const onNewTreeCreation = async () => {
    // add new group to db
    const newTree: Tree = {
      id: Gen16lenId(),
      nodes: GenInitialNodes(treeTitle),
      edges: GenInitialEdges(),
    };
    let newGroupState = structuredClone(groups[groupId]);
    if (newGroupState.trees) {
      newGroupState.trees.push(newTree);
    } else {
      newGroupState["trees"] = [newTree];
    }
    await set(ref(Db, `groups/${groupId}`), newGroupState);

    setTreeTitle("");
    // TODO: open the tree in main viewer
    onClose();
  };

  return (
    <GenericModal open={open} handleClose={onClose} title="make a new tree">
      <div
        style={{
          width: "640px",
          padding: "0px 16px 32px 16px",
          fontFamily: "Iosevka",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ margin: 4 }}>tree agenda</div>
        <TextField
          placeholder="ex: why is apple red?"
          style={{ width: "570px" }}
          value={treeTitle}
          onChange={(e) => setTreeTitle(e.target.value)}
        />

        <Button
          style={{ width: "570px", marginTop: 16 }}
          variant="outlined"
          onClick={() => {
            if (treeTitle.length > 0) {
              onNewTreeCreation();
            } else {
              alert("please enter a tree agenda");
            }
          }}
        >
          create
        </Button>
      </div>
    </GenericModal>
  );
};

export default NewTreeModal;
