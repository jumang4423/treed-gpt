import { useState } from "react";
import { Group, User } from "../helpers/user";
import GenericModal from "./GenericModal";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { ref, set, get } from "firebase/database";
import { Db } from "../helpers/firebase";
import { Gen16lenId } from "../helpers/genId";
interface Props {
  open: boolean;
  onClose: () => void;
}

const NewGroupModal = ({ open, onClose }: Props) => {
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const onNewGroupCreation = async () => {
    // add new group to db
    const newGroupId: string = Gen16lenId();
    const newGroupRef = ref(Db, `groups/${newGroupId}`);
    const newGroup: Group = {
      name: groupName,
      trees: [],
    };
    await set(newGroupRef, newGroup);
    // add group to user groups
    const userRef = ref(Db, `users/${localStorage.getItem("uid")}`);
    const userSnap = await get(userRef);
    const user: User = userSnap.val();
    const newUser: User = {
      ...user,
      group_ids: [...(user.group_ids || []), newGroupId],
    };
    await set(userRef, newUser);
    setGroupName("");
    onClose();
  };

  const onJoinGroup = async (groupId: string) => {
    // validate the group id
    const groupRef = ref(Db, `groups/${groupId}`);
    const groupSnap = await get(groupRef);
    const group: Group = groupSnap.val();
    if (!group) {
      alert("invalid group id");
      return;
    }
    // add group to user groups
    const userRef = ref(Db, `users/${localStorage.getItem("uid")}`);
    const userSnap = await get(userRef);
    const user: User = userSnap.val();
    // if duplicate group id, return
    if (user.group_ids?.includes(groupId)) {
      alert("already in group");
      return;
    }
    user.group_ids = [...(user.group_ids || []), groupId];
    await set(userRef, user);
    setGroupId("");
    onClose();
  };

  return (
    <GenericModal
      open={open}
      handleClose={onClose}
      title="create or join a group"
    >
      <div
        style={{
          width: "640px",
          padding: "0px 16px 32px 16px",
          fontFamily: "Iosevka",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ margin: 4 }}>$ make a new group</h3>
        <div style={{ margin: 4 }}>group name</div>
        <TextField
          placeholder="ex: jumango inc."
          style={{ width: "570px" }}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        <Button
          style={{ width: "570px", marginTop: 16 }}
          variant="outlined"
          onClick={() => {
            if (groupName.length > 0) {
              onNewGroupCreation();
            } else {
              alert("group name cannot be empty");
            }
          }}
        >
          create
        </Button>
        <h3 style={{ margin: 4, marginTop: 16 }}>$ join a group</h3>
        <div style={{ margin: 4 }}>group id</div>
        <TextField
          placeholder="ex: sldkjfasldkjlasdkjflkj"
          style={{ width: "570px" }}
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        />

        <Button
          style={{ width: "570px", marginTop: 16 }}
          variant="outlined"
          onClick={() => {
            if (groupId.length > 0) {
              onJoinGroup(groupId);
            } else {
              alert("group id cannot be empty");
            }
          }}
        >
          join
        </Button>
      </div>
    </GenericModal>
  );
};

export default NewGroupModal;
