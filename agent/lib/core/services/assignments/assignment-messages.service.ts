import type { AssignmentItemEntity } from "#core/entities/assignment-item.entity";
import { renderMessage } from "#core/helpers/messages";
import type { LocalizedMessageService } from "#core/services/translations/localized-message.service";

/** The texts the bot sends for assignments, in the language of whoever reads them. */
export class AssignmentMessagesService {
  private readonly localizedMessageService: LocalizedMessageService;

  constructor(localizedMessageService: LocalizedMessageService) {
    this.localizedMessageService = localizedMessageService;
  }

  /** The private message that announces a new assignment, before its first item. */
  getIntro(
    language: string | null,
    assignment: { assignerName: string; groupName: string; title: string; itemCount: number },
  ): Promise<string> {
    return this.localizedMessageService.getMessage("assignment.intro", language, assignment);
  }

  /** The private message after the last answer. */
  getDone(language: string | null, groupName: string): Promise<string> {
    return this.localizedMessageService.getMessage("assignment.done", language, { groupName });
  }

  /** The private message after the assignee cancels. */
  getCancelled(language: string | null, groupName: string): Promise<string> {
    return this.localizedMessageService.getMessage("assignment.cancelled", language, { groupName });
  }

  /** The group message for a completed assignment. */
  async getResult(
    language: string | null,
    assigneeName: string,
    title: string,
    items: AssignmentItemEntity[],
  ): Promise<string> {
    const params = { assigneeName, title, ...this.countCorrect(items) };
    const headline = await this.localizedMessageService.getMessage(
      params.graded > 0 ? "assignment.result.completed_scored" : "assignment.result.completed",
      language,
      params,
    );

    return this.joinResult(language, headline, items);
  }

  /** The group message for a cancelled assignment: the result covers only the items answered so far. */
  async getCancelledResult(
    language: string | null,
    assigneeName: string,
    title: string,
    items: AssignmentItemEntity[],
  ): Promise<string> {
    const answered = items.filter((item) => item.answer !== null);
    const params = {
      assigneeName,
      title,
      answered: answered.length,
      itemCount: items.length,
      ...this.countCorrect(answered),
    };
    const headline = await this.localizedMessageService.getMessage(
      params.graded > 0 ? "assignment.result.cancelled_scored" : "assignment.result.cancelled",
      language,
      params,
    );

    return this.joinResult(language, headline, answered);
  }

  private countCorrect(items: AssignmentItemEntity[]): { correct: number; graded: number } {
    const graded = items.filter((item) => item.expectedAnswer !== null);

    return { correct: graded.filter((item) => item.isCorrect === true).length, graded: graded.length };
  }

  /** The headline, then the mistakes of graded items and the answers to the others. */
  private async joinResult(language: string | null, headline: string, items: AssignmentItemEntity[]): Promise<string> {
    const mistakes = items.filter((item) => item.expectedAnswer !== null && item.isCorrect !== true);
    const ungraded = items.filter((item) => item.expectedAnswer === null);
    const sections = [headline];

    if (mistakes.length > 0) {
      const [title, template] = await Promise.all([
        this.localizedMessageService.getTemplate("assignment.result.mistakes", language),
        this.localizedMessageService.getTemplate("assignment.result.mistake", language),
      ]);

      sections.push(this.formatSection(title, template, mistakes));
    }

    if (ungraded.length > 0) {
      const [title, template] = await Promise.all([
        this.localizedMessageService.getTemplate("assignment.result.answers", language),
        this.localizedMessageService.getTemplate("assignment.result.answer", language),
      ]);

      sections.push(this.formatSection(title, template, ungraded));
    }

    return sections.join("\n\n");
  }

  private formatSection(title: string, answerTemplate: string, items: AssignmentItemEntity[]): string {
    return [
      title,
      ...items.map((item) => {
        const answer = renderMessage(answerTemplate, {
          answer: item.answer ?? "",
          expectedAnswer: item.expectedAnswer ?? "",
        });

        return `${item.position}. ${item.prompt}\n   ${answer}`;
      }),
    ].join("\n");
  }
}
