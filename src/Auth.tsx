import { useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { SettingsType, InitSettingsObj } from "./helpers/inits";
import App from "./App";
import { Fauth } from "./helpers/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { User, Group } from "./helpers/user";
import { Db } from "./helpers/firebase";

const Auth = () => {
  const [uid, setUid] = useState<string>(localStorage.getItem("uid") || "");
  const [settingsObj, setSettingsObj] = useState<SettingsType>(
    JSON.parse(localStorage.getItem("settings") || InitSettingsObj)
  );
  const isAuth = settingsObj.OpenAI.apiKey !== "" && uid !== "";
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settingsObj));
  }, [settingsObj]);
  useEffect(() => {
    localStorage.setItem("uid", uid);
  }, [uid]);

  if (isAuth) {
    return <App />;
  } else {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          fontFamily: "Iosevka",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "640px",
            flexDirection: "column",
            height: "480px",
          }}
        >
          <h2>$ treed-gpt auth</h2>
          <div style={{ margin: 4 }}>1. openai api key</div>
          <TextField
            placeholder="sk..."
            style={{ width: "400px" }}
            value={settingsObj.OpenAI.apiKey}
            error={settingsObj.OpenAI.apiKey === ""}
            type="password"
            onChange={(e) =>
              setSettingsObj({
                ...settingsObj,
                OpenAI: { ...settingsObj.OpenAI, apiKey: e.target.value },
              })
            }
          />
          <div style={{ margin: 4, marginTop: 16 }}>2. google login</div>
          <Button
            style={{ width: "40px" }}
            variant="outlined"
            onClick={async () => {
              const res = await signInWithPopup(
                Fauth,
                new GoogleAuthProvider()
              );
              const uid = res.user?.uid;
              const displayName = res.user?.displayName;
              const userRef = ref(Db, `users/${uid}`);
              const userSnap = await get(userRef);
              if (!userSnap.exists()) {
                // make user group
                const groupRef = ref(Db, `groups/${uid}`);
                await set(groupRef, {
                  name: `${displayName}'s group`,
                  trees: [],
                  isUserGroup: true,
                } as Group);
                // make user
                await set(userRef, {
                  displayName,
                  group_ids: [uid],
                } as User);
              }
              setUid(uid || "");
              // ???? we should reload for no reason
              window.location.reload();
            }}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }
};

export default Auth;
