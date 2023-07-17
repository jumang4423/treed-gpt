import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Db } from "../../helpers/firebase";
import { Tree } from "../../helpers/tree";
import { ref, get, onValue, set } from "firebase/database";
import { GroupsState } from "../../recoil/groups";
import NewTreeModal from "../NewTreeModal";

const getByteLength = (char: string) => {
  return new Blob([char]).size;
};

const strConcater = (str: string, maxLen: number) => {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (count + getByteLength(str[i]) > maxLen) {
      return str.slice(0, i) + "...";
    }
    count += getByteLength(str[i]);
  }
  return str;
};

const HistoryViewerGroup = ({ groupId }: { groupId: string }) => {
  const [groups, setGroups] = useRecoilState(GroupsState);
  const [isNewTreeModalOpen, setIsNewTreeModalOpen] = useState(false);

  const initObserver = async () => {
    // init fetch
    const groupRef = ref(Db, `groups/${groupId}`);
    const groupSnap = await get(groupRef);
    const groupData = groupSnap.val();
    setGroups((prev) => {
      return {
        ...prev,
        [groupId]: groupData,
      };
    });

    // subscribe to changes
    onValue(groupRef, (snap) => {
      const groupData = snap.val();
      if (groupData) {
        setGroups((prev) => {
          return {
            ...prev,
            [groupId]: groupData,
          };
        });
      }
    });
  };

  const onTreeDelete = async (treeId: string) => {
    const filteredTrees = groups[groupId].trees.filter(
      (tree) => tree.id !== treeId
    );
    // update
    await set(ref(Db, `groups/${groupId}/trees`), filteredTrees);
  };

  const onLeaveGroup = async () => {
    const userGroupsRef = ref(
      Db,
      `users/${localStorage.getItem("uid")}/group_ids`
    );
    const userGroupsSnap = await get(userGroupsRef);
    const userGroups = userGroupsSnap.val();
    const filteredUserGroups = userGroups.filter(
      (id: string) => id !== groupId
    );
    await set(userGroupsRef, filteredUserGroups);
  };

  useEffect(() => {
    initObserver();
  }, [groupId]);
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        key={groupId}
        style={{
          fontSize: "14px",
          margin: 0,
          height: 16,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        --= [ {groups[groupId]?.name || "fetching..."} ] =--
      </div>

      {!groups[groupId]?.isUserGroup && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 8,
            marginRight: 8,
            backgroundColor: "#eee",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            height: "20px",
            cursor: "pointer",
          }}
          onClick={() => {
            if (window.confirm("Are you sure you want to delete this group?")) {
              onLeaveGroup();
            }
          }}
        >
          <div style={{ margin: 4, fontSize: "14px" }}>- leave group</div>
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          marginLeft: 8,
          marginRight: 8,
          backgroundColor: "#eee",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: "20px",
          cursor: "pointer",
        }}
        onClick={() => {
          setIsNewTreeModalOpen(true);
        }}
      >
        <div style={{ margin: 4, fontSize: "14px" }}>+ new tree</div>
      </div>

      <div>
        {(groups[groupId]?.trees || []).map((tree: Tree, i: number) => {
          return (
            <div
              key={i}
              style={{
                margin: 8,
                backgroundColor: "#eee",
                cursor: "pointer",
              }}
              onClick={() => {
                {
                  /* setNodes(item.nodes);
                     setEdges(item.edges);
                     setTreeId(item.id);
                     onClose(); */
                }
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
                {strConcater(tree.nodes[0]["data"]["label"], 24)}
                <div
                  onClick={() => {
                    {
                      if (window.confirm("Are you sure?")) {
                        onTreeDelete(tree.id);
                      }
                    }
                  }}
                >
                  [x]
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <NewTreeModal
        groupId={groupId}
        open={isNewTreeModalOpen}
        onClose={() => {
          setIsNewTreeModalOpen(false);
        }}
      />
    </div>
  );
};

export default HistoryViewerGroup;
