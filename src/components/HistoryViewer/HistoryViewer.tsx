import { useRecoilState } from "recoil";
import { useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import { Db } from "../../helpers/firebase";
import { ref, get, onValue } from "firebase/database";
import { User } from "../../helpers/user";
import { UserState } from "../../recoil/user";
import HistoryViewerGroup from "./HistoryViewerGroup";
interface Props {
  open: boolean;
  onClose: () => void;
  setTreeId: (id: string | undefined) => void;
  setGroupId: (id: string | undefined) => void;
  onOpenNewGroupModal: () => void;
}

const HistoryViewer = ({
  open,
  onClose,
  setTreeId,
  setGroupId,
  onOpenNewGroupModal,
}: Props) => {
  const [userGroupList, setUserGroupList] = useRecoilState(UserState);
  const initObserve = async () => {
    const userRef = ref(Db, `users/${localStorage.getItem("uid")}`);
    const userSnap = await get(userRef);
    const user: User = userSnap.val();
    setUserGroupList(user);
    // TODO: ?
    // set observer
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserGroupList(data);
      }
    });
  };

  useEffect(() => {
    initObserve();
  }, []);

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <div style={{ width: "240px", fontFamily: "Iosevka", height: "100vh" }}>
        <div style={{ margin: 8, fontSize: "18px" }}>tree histories</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              marginLeft: 8,
              marginRight: 8,
              marginBottom: 16,
              backgroundColor: "#eee",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              height: "36px",
              cursor: "pointer",
            }}
            onClick={() => {
              onOpenNewGroupModal();
            }}
          >
            <div style={{ margin: 4, fontSize: "14px" }}>
              + create or join a group
            </div>
          </div>

          {(userGroupList.group_ids || []).map((groupId) => (
            <HistoryViewerGroup
              groupId={groupId}
              setTreeId={setTreeId}
              setGroupId={setGroupId}
              onClose={onClose}
            />
          ))}
        </div>
      </div>
    </Drawer>
  );
};

export default HistoryViewer;
