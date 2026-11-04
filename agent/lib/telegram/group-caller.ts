// The group and sender of the current turn, from the auth attributes TelegramMessageHandler sets.
// Tools scope their data by these, never by ids the model passes.

export interface GroupCaller {
  groupId: number;
  telegramUserId: string;
  /** The group message of this turn (set by eve's defaultTelegramAuth). */
  messageId: string;
}

type SessionAuth = { current?: { attributes?: Record<string, unknown> } | null };

/** Returns null outside a group chat (private chats carry no group_id). */
export function getGroupCaller(session: { auth: SessionAuth }): GroupCaller | null {
  const attributes = session.auth.current?.attributes;
  const groupId = Number(attributes?.group_id);
  const telegramUserId = attributes?.user_id;
  const messageId = attributes?.message_id;

  if (!Number.isInteger(groupId) || typeof telegramUserId !== "string" || typeof messageId !== "string") {
    return null;
  }
  return { groupId, telegramUserId, messageId };
}

export const NOT_IN_GROUP_ERROR = "Notes are only available in a group chat.";
