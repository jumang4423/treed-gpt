import { GPT4O_MODEL_STR } from "./openai";

export type SettingsType = {
  OpenAI: {
    apiKey: string;
    engine: string;
  };
  systemPrompt: string;
  historyMaxLen: number;
};

export const InitSettingsObj = JSON.stringify({
  OpenAI: {
    apiKey: "",
    engine: GPT4O_MODEL_STR,
  },
  systemPrompt: "you are a ai bot. you answers within 3-4 short sentences.",
  historyMaxLen: 8,
} as SettingsType);

export const InitialNodes = [
  {
    id: "init",
    position: {
      x: window.innerWidth / 2,
      y: 20,
    },
    style: { width: 320 },
    data: {
      label: "treed-gpt",
    },
    type: "input",
    deletable: false,
  },
];
export const InitialEdges: any = [];

export const GenInitialNodes = (init_agenda: string) => {
  return [
    {
      id: "init",
      position: {
        x: window.innerWidth / 2,
        y: 20,
      },
      style: { width: 320 },
      data: {
        label: init_agenda,
      },
      type: "input",
      deletable: false,
    },
  ];
};

export const GenInitialEdges = () => [];
