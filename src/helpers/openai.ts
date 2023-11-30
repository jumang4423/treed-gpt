export const GPT3_MODEL_STR = "gpt-3.5-turbo-16k";
export const GPT4_MODEL_STR = "gpt-4-1106-preview";
export const GPT4_VISION_MODEL_STR = "gpt-4-vision-preview";
export const EMBEDDING_MODEL_STR = "text-embedding-ada-002";
export type OpenAIMessage = {
  role: string;
  content: any;
};
