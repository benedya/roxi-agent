import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import {
  ASSIGNMENT_ITEM_MAX_LENGTH,
  ASSIGNMENT_MAX_ITEMS,
  ASSIGNMENT_TITLE_MAX_LENGTH,
  CreateAssignmentService,
} from "#core/services/assignments/create-assignment.service";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Give another member of this group an assignment: a list of items (questions or steps) that the bot sends them " +
    "one by one in a private chat. Their answers are collected automatically, and the result is posted in this chat " +
    "as a reply to the request. Write all the items yourself. Give an expected answer when an item has one correct, " +
    "short answer (a number or a few words), so it is graded; leave it out when any answer is fine.",
  inputSchema: z.object({
    assignee: z.string().min(1).describe("The member as the requester named them: their @username or first name"),
    title: z.string().min(1).max(ASSIGNMENT_TITLE_MAX_LENGTH).describe("A short title for the assignment"),
    items: z
      .array(
        z.object({
          prompt: z.string().min(1).max(ASSIGNMENT_ITEM_MAX_LENGTH).describe("The question or step, as the member will read it"),
          expectedAnswer: z
            .string()
            .min(1)
            .max(ASSIGNMENT_ITEM_MAX_LENGTH)
            .optional()
            .describe("The one correct answer, short; omit when any answer is fine"),
        }),
      )
      .min(1)
      .max(ASSIGNMENT_MAX_ITEMS)
      .describe("The items, in the order they are sent"),
  }),
  async execute({ assignee, title, items }, ctx) {
    const caller = getGroupCaller(ctx.session);

    if (!caller) {
      return { error: "Assignments can only be given in a group chat." };
    }

    const createAssignmentService = await resolve(CreateAssignmentService);
    const result = await createAssignmentService.create({
      groupId: caller.groupId,
      assignerTelegramId: caller.telegramUserId,
      assignee,
      title,
      items: items.map((item) => ({ prompt: item.prompt, expectedAnswer: item.expectedAnswer ?? null })),
      sourceMessageId: caller.messageId,
    });

    switch (result.status) {
      case "created":
        return { created: true, assignee: result.assigneeName, itemCount: result.itemCount };
      case "not_member":
        return {
          error:
            `No member of this group matches "${assignee}". Only members who have talked to the bot in this chat ` +
            "(mentioned it or replied to it) can get assignments.",
        };
      case "ambiguous_assignee":
        return { error: "Several members match this name; ask which one is meant.", candidates: result.candidates };
      case "assignee_busy":
        return {
          error: `${result.assigneeName} already has an unfinished assignment; they must finish or cancel it before getting a new one.`,
        };
      case "assignee_unreachable":
        return {
          error:
            `The bot can't message ${result.assigneeName} privately. ${result.assigneeName} needs to open a private ` +
            "chat with the bot and press Start, then the assignment can be given again.",
          unreachable: true,
        };
    }
  },
});
