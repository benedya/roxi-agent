import { IsNull, type EntityManager } from "typeorm";
import { AssignmentItemEntitySchema, type AssignmentItemEntity } from "#core/entities/assignment-item.entity";
import type { AssignmentItemInput } from "#core/types/assignment";

export class AssignmentItemRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): AssignmentItemRepository {
    return new AssignmentItemRepository(manager);
  }

  /** Inserts the items in the given order, numbered from 1. */
  async createMany(assignmentId: number, items: AssignmentItemInput[]): Promise<void> {
    await this.manager
      .createQueryBuilder()
      .insert()
      .into(AssignmentItemEntitySchema)
      .values(items.map((item, index) => ({ ...item, assignmentId, position: index + 1 })))
      .execute();
  }

  /** The first item without an answer: the one the assignee is answering now. */
  findNextUnanswered(assignmentId: number): Promise<AssignmentItemEntity | null> {
    return this.manager.findOne(AssignmentItemEntitySchema, {
      where: { assignmentId, answer: IsNull() },
      order: { position: "ASC" },
    });
  }

  findByAssignment(assignmentId: number): Promise<AssignmentItemEntity[]> {
    return this.manager.find(AssignmentItemEntitySchema, { where: { assignmentId }, order: { position: "ASC" } });
  }

  countByAssignment(assignmentId: number): Promise<number> {
    return this.manager.countBy(AssignmentItemEntitySchema, { assignmentId });
  }

  async setPromptMessageId(id: number, promptMessageId: string): Promise<void> {
    await this.manager.update(AssignmentItemEntitySchema, { id }, { promptMessageId });
  }

  /** Saves the answer; returns false when the item already had one (a concurrent message won). */
  async recordAnswer(id: number, answer: string, isCorrect: boolean | null): Promise<boolean> {
    const result = await this.manager
      .createQueryBuilder()
      .update(AssignmentItemEntitySchema)
      .set({ answer, isCorrect, answeredAt: () => "now()" })
      .where("id = :id AND answer IS NULL", { id })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
