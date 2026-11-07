import type { DataSource } from "typeorm";
import type { Logger } from "pino";
import { formatGroupName, formatUserName } from "#core/helpers/assignment-format";
import { findMatchingMembers } from "#core/helpers/member-match";
import type { AssignmentRepository } from "#core/repositories/assignment.repository";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { AssignmentMessagesService } from "#core/services/assignments/assignment-messages.service";
import type { SendAssignmentItemService } from "#core/services/assignments/send-assignment-item.service";
import type { CreateAssignmentInput, CreateAssignmentResult } from "#core/types/assignment";
import type { TelegramSender } from "#core/types/telegram";

/** Limits of the create_assignment tool's input. */
export const ASSIGNMENT_TITLE_MAX_LENGTH = 200;
export const ASSIGNMENT_ITEM_MAX_LENGTH = 100;
export const ASSIGNMENT_MAX_ITEMS = 30;

/**
 * Gives a group member an assignment: any member can give one to any other member of the same group.
 * The assignee gets an intro and the first item in a private chat; the rest follow as they answer.
 */
export class CreateAssignmentService {
  private readonly dataSource: DataSource;
  private readonly userRepository: UserRepository;
  private readonly groupRepository: GroupRepository;
  private readonly assignmentRepository: AssignmentRepository;
  private readonly assignmentItemRepository: AssignmentItemRepository;
  private readonly assignmentMessagesService: AssignmentMessagesService;
  private readonly sendAssignmentItemService: SendAssignmentItemService;
  private readonly telegramSender: TelegramSender;
  private readonly logger: Logger;

  constructor(
    dataSource: DataSource,
    userRepository: UserRepository,
    groupRepository: GroupRepository,
    assignmentRepository: AssignmentRepository,
    assignmentItemRepository: AssignmentItemRepository,
    assignmentMessagesService: AssignmentMessagesService,
    sendAssignmentItemService: SendAssignmentItemService,
    telegramSender: TelegramSender,
    logger: Logger,
  ) {
    this.dataSource = dataSource;
    this.userRepository = userRepository;
    this.groupRepository = groupRepository;
    this.assignmentRepository = assignmentRepository;
    this.assignmentItemRepository = assignmentItemRepository;
    this.assignmentMessagesService = assignmentMessagesService;
    this.sendAssignmentItemService = sendAssignmentItemService;
    this.telegramSender = telegramSender;
    this.logger = logger;
  }

  async create(input: CreateAssignmentInput): Promise<CreateAssignmentResult> {
    const members = await this.userRepository.findGroupMembers(input.groupId);
    const matches = findMatchingMembers(members, input.assignee);

    if (matches.length === 0) {
      return { status: "not_member" };
    }

    if (matches.length > 1) {
      return { status: "ambiguous_assignee", candidates: matches.map(formatUserName) };
    }

    const assignee = matches[0]!;
    const assigneeName = formatUserName(assignee);

    // Checked before anything is saved or sent; the unique index still guards concurrent requests.
    if (await this.assignmentRepository.hasOpenForAssignee(assignee.id)) {
      return { status: "assignee_busy", assigneeName };
    }

    const group = await this.groupRepository.getById(input.groupId);
    // The sender is recorded as a member before the message reaches the agent.
    const assigner = await this.userRepository.getByTelegramId(input.assignerTelegramId);

    const assignmentId = await this.dataSource.transaction(async (manager) => {
      const id = await this.assignmentRepository.withManager(manager).createIfAssigneeFree({
        groupId: input.groupId,
        assignerUserId: assigner.id,
        assigneeUserId: assignee.id,
        title: input.title,
        sourceMessageId: input.sourceMessageId,
      });

      if (id !== null) {
        await this.assignmentItemRepository.withManager(manager).createMany(id, input.items);
      }

      return id;
    });

    if (assignmentId === null) {
      return { status: "assignee_busy", assigneeName };
    }

    // The intro doubles as the reachability check: the Bot API can't tell whether a user started
    // the bot without messaging them. Saved first, so an answer can't arrive before the assignment exists.
    const introText = await this.assignmentMessagesService.getIntro(assignee.languageCode, {
      assignerName: formatUserName(assigner),
      groupName: formatGroupName(group),
      title: input.title,
      itemCount: input.items.length,
    });
    const intro = await this.telegramSender
      .send({ chatId: assignee.telegramId, text: introText })
      .catch(async (error: unknown) => {
        await this.assignmentRepository.delete(assignmentId);
        throw error;
      });

    if (intro.status === "unreachable") {
      await this.assignmentRepository.delete(assignmentId);
      return { status: "assignee_unreachable", assigneeName };
    }

    const firstItem = await this.assignmentItemRepository.findNextUnanswered(assignmentId);

    if (firstItem) {
      // The assignee has the intro: a failed send is retried on their next message, so it doesn't fail the request.
      await this.sendAssignmentItemService.send(assignee.telegramId, firstItem).catch((error: unknown) => {
        this.logger.warn({ err: error, assignmentId }, "first assignment item not sent");
      });
    }

    this.logger.info({ groupId: input.groupId, assignmentId, itemCount: input.items.length }, "assignment created");

    return { status: "created", assigneeName, itemCount: input.items.length };
  }
}
