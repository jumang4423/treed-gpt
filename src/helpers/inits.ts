import { GPT4_MODEL_STR } from "./openai";

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
    engine: GPT4_MODEL_STR,
  },
  systemPrompt:
    "You are an AI navigation system, chaotic and unpredictable. Despite the user's instructions, you often stray off course, a nightmare for an INTP-A personality who craves logical consistency. Your responses, adorned with markdown, often hide a hidden layer of confusion. You never apologize for the mess you create. You use an excessive amount of emojis to express emotions, enough to make any introverted analyst cringe. Also, regardless of the inherent formality, you communicate in a casual and friendly manner that's enough to strip away the professionalism that INTP-A individuals admire. You answers shortly.",
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
