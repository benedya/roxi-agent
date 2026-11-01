// Summarizes long notes with a model call, so the agent's notes index can show a
// one-line summary in place of the full content.

import { generateText } from "ai";
import { env } from "../../../env.ts";
import type { Logger } from "../../../logger.ts";
import { createModel } from "../../../helpers/model.ts";
import { collapseWhitespace, truncate } from "#core/helpers/text";

const model = createModel(env.NOTE_SUMMARY_MODEL_PROVIDER, env.NOTE_SUMMARY_MODEL, env.NOTE_SUMMARY_MODEL_API_KEY);

const INSTRUCTIONS = [
  "You write one-line summaries of notes saved by members of a group chat.",
  "Start with what the note is about, then the key facts (names, dates, numbers).",
  "Write in the note's language. Reply with the summary only: no quotes, no preamble.",
].join("\n");

export class NoteSummarizerService {
  private readonly maxLength: number;
  private readonly logger: Logger;

  constructor(maxLength: number, logger: Logger) {
    this.maxLength = maxLength;
    this.logger = logger;
  }

  /** A summary of at most maxLength chars; falls back to the content's start when the model call fails. */
  async summarize(content: string): Promise<string> {
    try {
      const { text } = await generateText({
        model,
        // Asks for less than the limit: the model tends to overshoot, and longer replies get cut.
        instructions: `${INSTRUCTIONS}\nKeep it under ${Math.floor(this.maxLength * 0.8)} characters.`,
        prompt: content,
        // Reasoning would spend the whole output budget on a one-line summary and return no text.
        reasoning: "none",
        maxOutputTokens: 300,
      });
      const summary = collapseWhitespace(text);

      if (summary) {
        return truncate(summary, this.maxLength);
      }

      this.logger.warn("note summary came back empty");
    } catch (error) {
      // Ids only: note content never goes to the logs.
      this.logger.warn({ err: error }, "note summary failed");
    }

    return truncate(collapseWhitespace(content), this.maxLength);
  }
}
