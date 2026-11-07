// The bot's fixed texts in English, the source for translations: plain text, since Telegram messages
// go out without a parse_mode. {name} marks a value filled in when the message is sent, so a translation
// is stored once per text and user data never reaches the translation model.
// Avoid wording that depends on a count ("1 item" / "2 items"): plural forms differ between languages.

export const MESSAGES = {
  "cancel.nothing_to_cancel": "There's nothing to cancel right now.",
  "group.welcome": [
    "Hi everyone! I'm your group assistant: I help you plan events, split tasks and costs, make decisions, and keep lists.",
    "To talk to me, mention {mention} or reply to one of my messages.",
    'My admins (whoever added me to this chat) can also tell me how to behave here, e.g. "{mention} always reply in English".',
  ].join("\n\n"),
  "assignment.intro": [
    '{assignerName} gave you an assignment in "{groupName}": "{title}" (items: {itemCount}).',
    "I'll send the items one by one. Reply to each one with your answer. Send /cancel to end it early.",
  ].join("\n\n"),
  "assignment.done": 'All done, thank you! I\'ve posted your results in "{groupName}".',
  "assignment.cancelled": 'Assignment cancelled. I\'ve let "{groupName}" know.',
  "assignment.result.completed": '{assigneeName} completed "{title}".',
  "assignment.result.completed_scored": '{assigneeName} completed "{title}": {correct}/{graded} correct.',
  "assignment.result.cancelled": '{assigneeName} cancelled "{title}" after {answered}/{itemCount} items.',
  "assignment.result.cancelled_scored":
    '{assigneeName} cancelled "{title}" after {answered}/{itemCount} items: {correct}/{graded} correct.',
  "assignment.result.mistakes": "Mistakes:",
  "assignment.result.answers": "Answers:",
  "assignment.result.mistake": "Answer: {answer}, expected: {expectedAnswer}",
  "assignment.result.answer": "Answer: {answer}",
} as const;

export type MessageKey = keyof typeof MESSAGES;

export type MessageParams = Record<string, string | number>;

/** Fills in a template's values in one pass, so a {name} inside a user's text stays as it is. */
export function renderMessage(template: string, params: MessageParams = {}): string {
  return template.replace(/\{(\w+)\}/gu, (placeholder, name: string) => String(params[name] ?? placeholder));
}
