import type { EntityManager } from "typeorm";
import { NoteEntitySchema, type NoteEntity } from "#core/entities/note.entity";
import type { NoteContent } from "#core/types/note";

export class NoteRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): NoteRepository {
    return new NoteRepository(manager);
  }

  async create(note: NoteContent & { groupId: number; authorUserId: number | null }): Promise<number> {
    const result = await this.manager
      .createQueryBuilder()
      .insert()
      .into(NoteEntitySchema)
      .values(note)
      .returning(["id"])
      .execute();
    return (result.raw as { id: number }[])[0]!.id;
  }

  /** The note with its author, only if it belongs to the group. */
  findInGroup(groupId: number, id: number): Promise<NoteEntity | null> {
    return this.manager.findOne(NoteEntitySchema, { where: { id, groupId }, relations: { author: true } });
  }

  /** The group's newest notes with their authors. */
  findRecent(groupId: number, limit: number): Promise<NoteEntity[]> {
    return this.manager.find(NoteEntitySchema, {
      where: { groupId },
      relations: { author: true },
      order: { createdAt: "DESC", id: "DESC" },
      take: limit,
    });
  }

  /** Replaces the note's content and summary. */
  async update(id: number, note: NoteContent): Promise<void> {
    await this.manager
      .createQueryBuilder()
      .update(NoteEntitySchema)
      .set({ ...note, updatedAt: () => "now()" })
      .where("id = :id", { id })
      .execute();
  }

  async delete(id: number): Promise<void> {
    await this.manager.delete(NoteEntitySchema, { id });
  }

  countInGroup(groupId: number): Promise<number> {
    return this.manager.countBy(NoteEntitySchema, { groupId });
  }

  /** The group's newest notes whose content or summary contains the text, case-insensitively. */
  search(groupId: number, text: string, limit: number): Promise<NoteEntity[]> {
    const pattern = `%${text.replace(/[\\%_]/g, "\\$&")}%`;
    return this.manager
      .createQueryBuilder(NoteEntitySchema, "note")
      .leftJoinAndSelect("note.author", "author")
      .where("note.groupId = :groupId", { groupId })
      .andWhere("(note.content ILIKE :pattern OR note.summary ILIKE :pattern)", { pattern })
      .orderBy("note.createdAt", "DESC")
      .addOrderBy("note.id", "DESC")
      .take(limit)
      .getMany();
  }
}
