import type { Logger } from "pino";
import { formatGroupName, formatUserName } from "#core/helpers/assignment-format";
import type { AssignmentRepository } from "#core/repositories/assignment.repository";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { AssignmentMessagesService } from "#core/services/assignments/assignment-messages.service";
import type { NotifyAssignmentClosedService } from "#core/services/assignments/notify-assignment-closed.service";

type CancelAssignmentResult = "cancelled" | "nothing_to_cancel";

/** Ends the assignee's open assignment early, keeping the answers so far, and posts them in the group. */
export class CancelAssignmentService {
  private readonly assignmentRepository: AssignmentRepository;
  private readonly assignmentItemRepository: AssignmentItemRepository;
  private readonly assignmentMessagesService: AssignmentMessagesService;
  private readonly notifyAssignmentClosedService: NotifyAssignmentClosedService;
  private readonly logger: Logger;

  constructor(
    assignmentRepository: AssignmentRepository,
    assignmentItemRepository: AssignmentItemRepository,
    assignmentMessagesService: AssignmentMessagesService,
    notifyAssignmentClosedService: NotifyAssignmentClosedService,
    logger: Logger,
  ) {
    this.assignmentRepository = assignmentRepository;
    this.assignmentItemRepository = assignmentItemRepository;
    this.assignmentMessagesService = assignmentMessagesService;
    this.notifyAssignmentClosedService = notifyAssignmentClosedService;
    this.logger = logger;
  }

  async cancel(assigneeTelegramId: string): Promise<CancelAssignmentResult> {
    const assignment = await this.assignmentRepository.findOpenByAssigneeTelegramId(assigneeTelegramId);

    if (!assignment) {
      return "nothing_to_cancel";
    }

    // The last answer may have completed it in the meantime: then its result is the one posted.
    if (!(await this.assignmentRepository.markCancelled(assignment.id))) {
      return "nothing_to_cancel";
    }

    const items = await this.assignmentItemRepository.findByAssignment(assignment.id);

    await this.notifyAssignmentClosedService.notify(assignment, {
      assignee: await this.assignmentMessagesService.getCancelled(
        assignment.assignee.languageCode,
        formatGroupName(assignment.group),
      ),
      group: await this.assignmentMessagesService.getCancelledResult(
        assignment.assigner.languageCode,
        formatUserName(assignment.assignee),
        assignment.title,
        items,
      ),
    });

    this.logger.info({ assignmentId: assignment.id, groupId: assignment.groupId }, "assignment cancelled");

    return "cancelled";
  }
}
