import type { EntityManager } from "typeorm";
import { ReminderEntitySchema, ReminderStatus, type ReminderEntity } from "#core/entities/reminder.entity";
import type { ReminderWithParticipants } from "#core/types/reminder";

export class ReminderRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): ReminderRepository {
    return new ReminderRepository(manager);
  }

  async create(reminder: {
    groupId: number;
    creatorUserId: number;
    text: string;
    rrule: string | null;
    dtstart: string | null;
    dueAt: Date;
    sourceMessageId: string;
  }): Promise<number> {
    const result = await this.manager
      .createQueryBuilder()
      .insert()
      .into(ReminderEntitySchema)
      .values(reminder)
      .returning(["id"])
      .execute();

    return (result.raw as { id: number }[])[0]!.id;
  }

  countPendingByGroup(groupId: number): Promise<number> {
    return this.manager.countBy(ReminderEntitySchema, { groupId, status: ReminderStatus.Pending });
  }

  /** The group's pending reminders with their creators, soonest first. */
  async findPendingByGroup(groupId: number): Promise<(ReminderEntity & Pick<ReminderWithParticipants, "creator">)[]> {
    const reminders = await this.manager
      .createQueryBuilder(ReminderEntitySchema, "reminder")
      .innerJoinAndSelect("reminder.creator", "creator")
      .where("reminder.groupId = :groupId", { groupId })
      .andWhere("reminder.status = :status", { status: ReminderStatus.Pending })
      .orderBy("reminder.dueAt", "ASC")
      .getMany();
    // The inner join loads creator.
    return reminders as (ReminderEntity & Pick<ReminderWithParticipants, "creator">)[];
  }

  findPendingInGroup(groupId: number, id: number): Promise<ReminderEntity | null> {
    return this.manager.findOneBy(ReminderEntitySchema, { id, groupId, status: ReminderStatus.Pending });
  }

  /**
   * Locks the earliest due pending reminder, skipping rows another dispatcher holds, and loads its group
   * and creator. Call it inside a transaction: the lock lasts until it ends.
   */
  async lockNextDue(now: Date, excludedIds: number[]): Promise<ReminderWithParticipants | null> {
    const query = this.manager
      .createQueryBuilder(ReminderEntitySchema, "reminder")
      .innerJoinAndSelect("reminder.group", "group")
      .innerJoinAndSelect("reminder.creator", "creator")
      .where("reminder.status = :status", { status: ReminderStatus.Pending })
      .andWhere("reminder.dueAt <= :now", { now })
      .orderBy("reminder.dueAt", "ASC")
      .limit(1)
      .setLock("pessimistic_write", undefined, ["reminder"])
      .setOnLocked("skip_locked");

    if (excludedIds.length > 0) {
      query.andWhere("reminder.id NOT IN (:...excludedIds)", { excludedIds });
    }

    // The inner joins load group and creator.
    return (await query.getOne()) as ReminderWithParticipants | null;
  }

  async updateDueAt(id: number, dueAt: Date): Promise<void> {
    await this.manager.update(ReminderEntitySchema, { id }, { dueAt });
  }

  /** Moves a repeating reminder to its next run after it was posted. */
  async reschedule(id: number, dueAt: Date, sentMessageId: string): Promise<void> {
    await this.manager.update(ReminderEntitySchema, { id }, { dueAt, lastSentMessageId: sentMessageId });
  }

  async markSent(id: number, sentMessageId: string): Promise<void> {
    await this.manager.update(
      ReminderEntitySchema,
      { id },
      { status: ReminderStatus.Sent, lastSentMessageId: sentMessageId },
    );
  }

  async markFailed(id: number): Promise<void> {
    await this.manager.update(ReminderEntitySchema, { id }, { status: ReminderStatus.Failed });
  }

  /** Cancels the reminder; returns false when it was no longer pending. */
  async markCancelled(id: number): Promise<boolean> {
    const result = await this.manager
      .createQueryBuilder()
      .update(ReminderEntitySchema)
      .set({ status: ReminderStatus.Cancelled, cancelledAt: () => "now()" })
      .where("id = :id AND status = :status", { id, status: ReminderStatus.Pending })
      .execute();

    return (result.affected ?? 0) > 0;
  }
}
