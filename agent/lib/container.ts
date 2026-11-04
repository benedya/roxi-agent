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
import { CompleteAssignmentService } from "#core/services/assignments/complete-assignment.service";
import { CreateAssignmentService } from "#core/services/assignments/create-assignment.service";
import { RecordAnswerService } from "#core/services/assignments/record-answer.service";
import { SendAssignmentItemService } from "#core/services/assignments/send-assignment-item.service";
import { AssignmentRepository } from "#core/repositories/assignment.repository";
import { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import { AssignmentAnswerHandler } from "./telegram/assignment-answer.handler.ts";
import { BotAddedHandler } from "./telegram/bot-added.handler.ts";
import { TelegramBotApi } from "./telegram/telegram-bot-api.ts";
import { GroupOnboardingService } from "#core/services/groups/group-onboarding.service";
import { GroupRepository } from "#core/repositories/group.repository";
import { GroupMemberRepository } from "#core/repositories/group-member.repository";
import { NoteRepository } from "#core/repositories/note.repository";
import { UserRepository } from "#core/repositories/user.repository";
import { TelegramMessageHandler } from "./telegram/telegram-message.handler.ts";
import { createLogger, LOGGER, type Logger } from "./logger.ts";
import { env } from "./env.ts";

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
    .bind(AssignmentRepository)
    .toResolvedValue((m: EntityManager) => new AssignmentRepository(m), [EntityManager]);
  container
    .bind(AssignmentItemRepository)
    .toResolvedValue((m: EntityManager) => new AssignmentItemRepository(m), [EntityManager]);

  container.bind(TelegramBotApi).toResolvedValue(() => new TelegramBotApi(env.TELEGRAM_BOT_TOKEN));

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
        new SaveNoteService(noteRepository, userRepository, noteContentService, env.MAX_NOTES_PER_GROUP),
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
    .bind(SendAssignmentItemService)
    .toResolvedValue(
      (assignmentItemRepository: AssignmentItemRepository, telegramBotApi: TelegramBotApi) =>
        new SendAssignmentItemService(assignmentItemRepository, telegramBotApi),
      [AssignmentItemRepository, TelegramBotApi],
    );
  container
    .bind(CreateAssignmentService)
    .toResolvedValue(
      (
        ds: DataSource,
        userRepository: UserRepository,
        groupRepository: GroupRepository,
        assignmentRepository: AssignmentRepository,
        assignmentItemRepository: AssignmentItemRepository,
        sendAssignmentItemService: SendAssignmentItemService,
        telegramBotApi: TelegramBotApi,
        logger: Logger,
      ) =>
        new CreateAssignmentService(
          ds,
          userRepository,
          groupRepository,
          assignmentRepository,
          assignmentItemRepository,
          sendAssignmentItemService,
          telegramBotApi,
          logger.child({ module: "CreateAssignmentService" }),
        ),
      [
        DataSource,
        UserRepository,
        GroupRepository,
        AssignmentRepository,
        AssignmentItemRepository,
        SendAssignmentItemService,
        TelegramBotApi,
        LOGGER,
      ],
    );
  container
    .bind(CompleteAssignmentService)
    .toResolvedValue(
      (
        assignmentRepository: AssignmentRepository,
        assignmentItemRepository: AssignmentItemRepository,
        telegramBotApi: TelegramBotApi,
        logger: Logger,
      ) =>
        new CompleteAssignmentService(
          assignmentRepository,
          assignmentItemRepository,
          telegramBotApi,
          logger.child({ module: "CompleteAssignmentService" }),
        ),
      [AssignmentRepository, AssignmentItemRepository, TelegramBotApi, LOGGER],
    );
  container
    .bind(RecordAnswerService)
    .toResolvedValue(
      (
        assignmentRepository: AssignmentRepository,
        assignmentItemRepository: AssignmentItemRepository,
        sendAssignmentItemService: SendAssignmentItemService,
        completeAssignmentService: CompleteAssignmentService,
      ) =>
        new RecordAnswerService(
          assignmentRepository,
          assignmentItemRepository,
          sendAssignmentItemService,
          completeAssignmentService,
        ),
      [AssignmentRepository, AssignmentItemRepository, SendAssignmentItemService, CompleteAssignmentService],
    );
  container
    .bind(AssignmentAnswerHandler)
    .toResolvedValue(
      (recordAnswerService: RecordAnswerService, logger: Logger) =>
        new AssignmentAnswerHandler(recordAnswerService, logger.child({ module: "AssignmentAnswerHandler" })),
      [RecordAnswerService, LOGGER],
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
        assignmentAnswerHandler: AssignmentAnswerHandler,
        groupAccessService: GroupAccessService,
        groupMembershipService: GroupMembershipService,
        logger: Logger,
      ) =>
        new TelegramMessageHandler(
          botAddedHandler,
          assignmentAnswerHandler,
          groupAccessService,
          groupMembershipService,
          logger.child({ module: "TelegramMessageHandler" }),
        ),
      [BotAddedHandler, AssignmentAnswerHandler, GroupAccessService, GroupMembershipService, LOGGER],
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
