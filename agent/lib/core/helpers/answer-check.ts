// Grades an assignee's answer against the expected one, in code rather than by a model,
// so the assignee can't talk the bot into a better result.

import { collapseWhitespace } from "#core/helpers/text";

/** Equal ignoring case, extra spaces and trailing punctuation; numbers compare by value ("12" = "12.0", "0,5" = "0.5"). */
export function isAnswerCorrect(expectedAnswer: string, answer: string): boolean {
  const expected = normalizeAnswer(expectedAnswer);
  const given = normalizeAnswer(answer);
  if (expected === given) {
    return true;
  }

  const expectedNumber = parseNumber(expected);
  const givenNumber = parseNumber(given);
  return expectedNumber !== null && givenNumber !== null && expectedNumber === givenNumber;
}

function normalizeAnswer(text: string): string {
  return collapseWhitespace(text)
    .toLowerCase()
    .replace(/[.!]+$/u, "");
}

function parseNumber(text: string): number | null {
  const compact = text.replace(/\s/g, "").replace(",", ".");
  return /^[-+]?\d+(\.\d+)?$/.test(compact) ? Number(compact) : null;
}
