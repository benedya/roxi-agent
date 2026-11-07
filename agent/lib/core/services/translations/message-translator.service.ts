// Translates the bot's fixed texts with a model call. Only templates from the code reach the
// model, never user data.

import { generateText } from "ai";
import { env } from "#lib/env";
import type { Logger } from "pino";
import { createModel } from "#lib/helpers/model";

const model = createModel(env.AGENT_MODEL_PROVIDER, env.AGENT_MODEL, env.AGENT_MODEL_API_KEY);

const TIMEOUT_MS = 10_000;

/** Parts of a template that must survive translation unchanged: {placeholders} and /commands. */
const PROTECTED_TOKENS = /\{\w+\}|(?<![\w/])\/[a-z]+\b/gu;

export class MessageTranslatorService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /** The template in the given language, or null when the model call fails or breaks the template. */
  async translate(template: string, language: string): Promise<string | null> {
    try {
      const { text } = await generateText({
        model,
        instructions: [
          "You translate messages of a Telegram bot from English into the language with this IETF tag: " + language + ".",
          "Write natural, friendly text with the same meaning and the same line breaks.",
          "Copy every {placeholder} and /command exactly as written; never translate or remove them.",
          "Reply with the translation only: no quotes, no preamble.",
        ].join("\n"),
        prompt: template,
        // Reasoning would add delay to a message the user is waiting for.
        reasoning: "none",
        maxOutputTokens: 1000,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const translation = text.trim();

      if (translation && this.keepsProtectedTokens(template, translation)) {
        return translation;
      }

      this.logger.warn({ language }, "translation rejected: empty or missing placeholders");
    } catch (error) {
      this.logger.warn({ err: error, language }, "translation failed");
    }

    return null;
  }

  private keepsProtectedTokens(template: string, translation: string): boolean {
    return this.findProtectedTokens(template) === this.findProtectedTokens(translation);
  }

  /** The distinct tokens in a fixed order, so a translation may reorder or repeat them. */
  private findProtectedTokens(text: string): string {
    return [...new Set(text.match(PROTECTED_TOKENS))].sort().join(" ");
  }
}
