import type { EntityManager } from "typeorm";
import { AssignmentEntitySchema, AssignmentStatus } from "#core/entities/assignment.entity";
import type { AssignmentWithParticipants } from "#core/types/assignment";

export class AssignmentRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): AssignmentRepository {
    return new AssignmentRepository(manager);
  }

  /**
   * Inserts an open assignment; returns null when the assignee already has an open one
   * (assignments_assignee_open_key).
   */
  async createIfAssigneeFree(assignment: {
    groupId: number;
    assignerUserId: number;
    assigneeUserId: number;
    title: string;
    sourceMessageId: string;
  }): Promise<number | null> {
    const result = await this.manager
      .createQueryBuilder()
      .insert()
      .into(AssignmentEntitySchema)
      .values(assignment)
      .orIgnore()
      .returning(["id"])
      .execute();

    return (result.raw as { id: number }[])[0]?.id ?? null;
  }

  hasOpenForAssignee(assigneeUserId: number): Promise<boolean> {
    return this.manager.existsBy(AssignmentEntitySchema, { assigneeUserId, status: AssignmentStatus.Open });
  }

  /** The user's open assignment with its group, assignee and assigner. */
  async findOpenByAssigneeTelegramId(telegramId: string): Promise<AssignmentWithParticipants | null> {
    const assignment = await this.manager
      .createQueryBuilder(AssignmentEntitySchema, "assignment")
      .innerJoinAndSelect("assignment.assignee", "assignee")
      .innerJoinAndSelect("assignment.group", "group")
      .innerJoinAndSelect("assignment.assigner", "assigner")
      .where("assignee.telegramId = :telegramId", { telegramId })
      .andWhere("assignment.status = :status", { status: AssignmentStatus.Open })
      .getOne();
    // The inner joins load group, assignee and assigner.
    return assignment as AssignmentWithParticipants | null;
  }

  /** Closes the assignment; returns false when it was no longer open. */
  async markCompleted(id: number): Promise<boolean> {
    const result = await this.manager
      .createQueryBuilder()
      .update(AssignmentEntitySchema)
      .set({ status: AssignmentStatus.Completed, completedAt: () => "now()" })
      .where("id = :id AND status = :status", { id, status: AssignmentStatus.Open })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async delete(id: number): Promise<void> {
    await this.manager.delete(AssignmentEntitySchema, { id });
  }
}
