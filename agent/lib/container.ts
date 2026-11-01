// Inversify container, wired without decorators: each class is bound with
// toResolvedValue(factory, [dependencies]), so the classes stay plain and run
// under Node's type stripping as well as eve's Vite build.
// Everything is a singleton; per-message objects (TelegramGateway) are created by the caller.

import { Container, type ServiceIdentifier } from "inversify";
import { DataSource, EntityManager } from "typeorm";
import { getDataSource } from "#core/db/data-source";
import { GroupAccessService } from "#core/services/groups/group-access.service";
import { FindGroupInstructionsService } from "#core/services/groups/find-group-instructions.service";
import { GroupMembershipService } from "#core/services/groups/group-membership.service";
import { UpdateGroupInstructionsService } from "#core/services/groups/update-group-instructions.service";
import { DeleteNoteService } from "#core/services/notes/delete-note.service";
import { EditNoteService } from "#core/services/notes/edit-note.service";
import { GetNoteService } from "#core/services/notes/get-note.service";
import { ListRecentNotesService } from "#core/services/notes/list-recent-notes.service";
import { NoteChangeAccessService } from "#core/services/notes/note-change-access.service";
import { NoteContentService, SUMMARY_MAX_LENGTH } from "#core/services/notes/note-content.service";
import { NoteSummarizerService } from "#core/services/notes/note-summarizer.service";
import { SaveNoteService } from "#core/services/notes/save-note.service";
import { SearchNotesService } from "#core/services/notes/search-notes.service";
import { BotAddedHandler } from "./telegram/bot-added.handler.ts";
import { GroupOnboardingService } from "#core/services/groups/group-onboarding.service";
import { GroupRepository } from "#core/repositories/group.repository";
import { GroupMemberRepository } from "#core/repositories/group-member.repository";
import { NoteRepository } from "#core/repositories/note.repository";
import { UserRepository } from "#core/repositories/user.repository";
import { TelegramMessageHandler } from "./telegram/telegram-message.handler.ts";
import { createLogger, LOGGER, type Logger } from "./logger.ts";

export function createContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });

  container.bind<Logger>(LOGGER).toResolvedValue(() => createLogger());
  container.bind(DataSource).toResolvedValue(() => getDataSource());
  container.bind(EntityManager).toResolvedValue((ds: DataSource) => ds.manager, [DataSource]);

  container.bind(UserRepository).toResolvedValue((m: EntityManager) => new UserRepository(m), [EntityManager]);
  container.bind(GroupRepository).toResolvedValue((m: EntityManager) => new GroupRepository(m), [EntityManager]);
  container
    .bind(GroupMemberRepository)
    .toResolvedValue((m: EntityManager) => new GroupMemberRepository(m), [EntityManager]);
  container.bind(NoteRepository).toResolvedValue((m: EntityManager) => new NoteRepository(m), [EntityManager]);

  container
    .bind(GroupAccessService)
    .toResolvedValue(
      (groupRepository: GroupRepository) => new GroupAccessService(groupRepository),
      [GroupRepository],
    );
  container
    .bind(FindGroupInstructionsService)
    .toResolvedValue(
      (groupRepository: GroupRepository) => new FindGroupInstructionsService(groupRepository),
      [GroupRepository],
    );
  container
    .bind(UpdateGroupInstructionsService)
    .toResolvedValue(
      (groupRepository: GroupRepository, userRepository: UserRepository, groupMemberRepository: GroupMemberRepository) =>
        new UpdateGroupInstructionsService(groupRepository, userRepository, groupMemberRepository),
      [GroupRepository, UserRepository, GroupMemberRepository],
    );
  container
    .bind(NoteSummarizerService)
    .toResolvedValue(
      (logger: Logger) =>
        new NoteSummarizerService(SUMMARY_MAX_LENGTH, logger.child({ module: "NoteSummarizerService" })),
      [LOGGER],
    );
  container
    .bind(NoteContentService)
    .toResolvedValue((summarizer: NoteSummarizerService) => new NoteContentService(summarizer), [NoteSummarizerService]);
  container
    .bind(NoteChangeAccessService)
    .toResolvedValue(
      (
        noteRepository: NoteRepository,
        userRepository: UserRepository,
        groupMemberRepository: GroupMemberRepository,
      ) => new NoteChangeAccessService(noteRepository, userRepository, groupMemberRepository),
      [NoteRepository, UserRepository, GroupMemberRepository],
    );
  container
    .bind(SaveNoteService)
    .toResolvedValue(
      (noteRepository: NoteRepository, userRepository: UserRepository, noteContentService: NoteContentService) =>
        new SaveNoteService(noteRepository, userRepository, noteContentService),
      [NoteRepository, UserRepository, NoteContentService],
    );
  container
    .bind(EditNoteService)
    .toResolvedValue(
      (
        noteRepository: NoteRepository,
        noteChangeAccessService: NoteChangeAccessService,
        noteContentService: NoteContentService,
      ) => new EditNoteService(noteRepository, noteChangeAccessService, noteContentService),
      [NoteRepository, NoteChangeAccessService, NoteContentService],
    );
  container
    .bind(DeleteNoteService)
    .toResolvedValue(
      (noteRepository: NoteRepository, noteChangeAccessService: NoteChangeAccessService) =>
        new DeleteNoteService(noteRepository, noteChangeAccessService),
      [NoteRepository, NoteChangeAccessService],
    );
  container
    .bind(GetNoteService)
    .toResolvedValue((noteRepository: NoteRepository) => new GetNoteService(noteRepository), [NoteRepository]);
  container
    .bind(SearchNotesService)
    .toResolvedValue((noteRepository: NoteRepository) => new SearchNotesService(noteRepository), [NoteRepository]);
  container
    .bind(ListRecentNotesService)
    .toResolvedValue((noteRepository: NoteRepository) => new ListRecentNotesService(noteRepository), [NoteRepository]);
  container
    .bind(GroupMembershipService)
    .toResolvedValue(
      (
        ds: DataSource,
        userRepository: UserRepository,
        groupMemberRepository: GroupMemberRepository,
        logger: Logger,
      ) =>
        new GroupMembershipService(ds, userRepository, groupMemberRepository, logger.child({ module: "GroupMembershipService" })),
      [DataSource, UserRepository, GroupMemberRepository, LOGGER],
    );
  container
    .bind(GroupOnboardingService)
    .toResolvedValue(
      (
        ds: DataSource,
        userRepository: UserRepository,
        groupRepository: GroupRepository,
        groupMemberRepository: GroupMemberRepository,
        logger: Logger,
      ) =>
        new GroupOnboardingService(
          ds,
          userRepository,
          groupRepository,
          groupMemberRepository,
          logger.child({ module: "GroupOnboardingService" }),
        ),
      [DataSource, UserRepository, GroupRepository, GroupMemberRepository, LOGGER],
    );
  container
    .bind(BotAddedHandler)
    .toResolvedValue(
      (groupOnboardingService: GroupOnboardingService, logger: Logger) =>
        new BotAddedHandler(groupOnboardingService, logger.child({ module: "BotAddedHandler" })),
      [GroupOnboardingService, LOGGER],
    );

  container
    .bind(TelegramMessageHandler)
    .toResolvedValue(
      (
        botAddedHandler: BotAddedHandler,
        groupAccessService: GroupAccessService,
        groupMembershipService: GroupMembershipService,
        logger: Logger,
      ) =>
        new TelegramMessageHandler(
          botAddedHandler,
          groupAccessService,
          groupMembershipService,
          logger.child({ module: "TelegramMessageHandler" }),
        ),
      [BotAddedHandler, GroupAccessService, GroupMembershipService, LOGGER],
    );

  return container;
}

let container: Container | undefined;

/**
 * Resolves a service from the app-wide container. If resolution fails (e.g. the
 * database is down), the container is dropped so the next call starts fresh
 * instead of reusing a failed singleton.
 */
export async function resolve<T>(service: ServiceIdentifier<T>): Promise<T> {
  container ??= createContainer();
  try {
    return await container.getAsync<T>(service);
  } catch (error) {
    container = undefined;
    throw error;
  }
}
