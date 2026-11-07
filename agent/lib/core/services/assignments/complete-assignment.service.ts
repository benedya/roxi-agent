import type { Logger } from "pino";
import { formatGroupName, formatUserName } from "#core/helpers/assignment-format";
import type { AssignmentRepository } from "#core/repositories/assignment.repository";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { AssignmentMessagesService } from "#core/services/assignments/assignment-messages.service";
import type { NotifyAssignmentClosedService } from "#core/services/assignments/notify-assignment-closed.service";
import type { AssignmentWithParticipants } from "#core/types/assignment";

/** Closes an answered assignment, thanks the assignee, and posts the result in the group as a reply to the request. */
export class CompleteAssignmentService {
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

  async complete(assignment: AssignmentWithParticipants): Promise<void> {
    // Another message may have completed it already: the result is posted once.
    if (!(await this.assignmentRepository.markCompleted(assignment.id))) {
      return;
    }

    const items = await this.assignmentItemRepository.findByAssignment(assignment.id);

    await this.notifyAssignmentClosedService.notify(assignment, {
      assignee: await this.assignmentMessagesService.getDone(
        assignment.assignee.languageCode,
        formatGroupName(assignment.group),
      ),
      group: await this.assignmentMessagesService.getResult(
        assignment.assigner.languageCode,
        formatUserName(assignment.assignee),
        assignment.title,
        items,
      ),
    });

    this.logger.info({ assignmentId: assignment.id, groupId: assignment.groupId }, "assignment completed");
  }
}
