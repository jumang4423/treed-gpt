import { useEffect } from "react";
import GenericModal from "./GenericModal";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import {
  GPT3_MODEL_STR,
  GPT4_MODEL_STR,
  GPT4_VISION_MODEL_STR,
} from "../helpers/openai";
import { SettingsType } from "../helpers/inits";

interface Props {
  open: boolean;
  onClose: () => void;
  settingsObj: SettingsType;
  setSettingsObj: (settingsObj: SettingsType) => void;
  setIsModalOpen: (isModalOpen: boolean) => void;
}

const SettingModal = ({
  open,
  onClose,
  settingsObj,
  setSettingsObj,
  setIsModalOpen,
}: Props) => {
  // apply to local storage
  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settingsObj));
    if (settingsObj.OpenAI.apiKey === "") {
      setIsModalOpen(true);
    }
  }, [settingsObj]);

  return (
    <GenericModal open={open} handleClose={onClose} title="treed-gpt settings">
      <div
        style={{
          width: "640px",
          padding: "0px 16px 32px 16px",
          fontFamily: "Iosevka",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ margin: 4 }}>openai api key</div>
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
        <div style={{ margin: 4, marginTop: 16 }}>model</div>
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
          <MenuItem value={GPT4_VISION_MODEL_STR}>gpt4 vision</MenuItem>
          <MenuItem value={GPT4_MODEL_STR}>gpt4</MenuItem>
          <MenuItem value={GPT3_MODEL_STR}>gpt3.5 turbo 16k</MenuItem>
        </Select>
        <div style={{ margin: 4, marginTop: 16 }}>system prompt</div>
        <TextField
          placeholder="you are a..."
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
        <Button
          style={{ width: "570px", marginBottom: 8, marginTop: 16 }}
          variant="outlined"
          onClick={() => {
            if (window.confirm("Are you sure you want to log out?")) {
              localStorage.removeItem("uid");
              window.location.reload();
            }
          }}
        >
          Logout
        </Button>

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
  );
};

export default SettingModal;
