import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const MODEL_PROVIDERS = ["deepseek", "openai"] as const;

export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

/** A direct-provider model, called with its own API key rather than the provider's default env var. */
export function createModel(provider: ModelProvider, modelId: string, apiKey: string): LanguageModel {
  switch (provider) {
    case "deepseek":
      return createDeepSeek({ apiKey })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
  }
}
