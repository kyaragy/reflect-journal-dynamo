import {
  createDefaultTitleForAiNoteType,
  createEmptyAiJournalSnapshot,
  normalizeAiJournalNote,
  normalizeAiJournalSnapshot,
  type AiJournalNote,
  type CreateAiJournalNoteInput,
  type UpdateAiJournalNoteInput,
} from '../../../src/domain/aiJournal';
import type { BookProperties } from '../../../src/domain/book';
import {
  createEmptyOneOnOneSnapshot,
  createOneOnOneRunId,
  normalizeOneOnOneRun,
  normalizeOneOnOneSnapshot,
  type ImportOneOnOneSummaryInput,
  type OneOnOneRun,
} from '../../../src/domain/oneOnOne';
import type { CreateOneOnOneRunInput } from '../../../src/repositories/oneOnOneRepository';
import { DynamoDbClient } from '../db/dynamoDbClient';
import type { AiJournalDataRepository } from './aiJournalDataRepository';

type AiJournalNoteItem = {
  PK: string;
  SK: string;
  entityType: 'AI_NOTE';
  note: AiJournalNote;
  updatedAt: string;
};

type OneOnOneRunItem = {
  PK: string;
  SK: string;
  entityType: 'AI_ONE_ON_ONE_RUN';
  run: OneOnOneRun;
  updatedAt: string;
};

const toUserPk = (userId: string) => `USER#${userId}`;
const toNoteSk = (noteId: string) => `AI_NOTE#${noteId}`;
const toRunSk = (runId: string) => `AI_ONE_ON_ONE_RUN#${runId}`;

const toNoteItem = (userId: string, note: AiJournalNote): AiJournalNoteItem => ({
  PK: toUserPk(userId),
  SK: toNoteSk(note.id),
  entityType: 'AI_NOTE',
  note,
  updatedAt: note.updatedAt,
});

const toRunItem = (userId: string, run: OneOnOneRun): OneOnOneRunItem => ({
  PK: toUserPk(userId),
  SK: toRunSk(run.id),
  entityType: 'AI_ONE_ON_ONE_RUN',
  run,
  updatedAt: run.createdAt,
});

export class DynamoDbAiJournalRepository implements AiJournalDataRepository {
  constructor(private readonly client: DynamoDbClient) {}

  async getAiJournalSnapshot(userId: string) {
    const items = await this.client.queryByPrefix<AiJournalNoteItem>(toUserPk(userId), 'AI_NOTE#');
    return normalizeAiJournalSnapshot({
      notes: items
        .filter((item) => item.entityType === 'AI_NOTE')
        .map((item) => normalizeAiJournalNote(item.note)),
    });
  }

  async createAiJournalNote(userId: string, input: CreateAiJournalNoteInput) {
    const now = new Date().toISOString();
    const note = normalizeAiJournalNote({
      id: crypto.randomUUID(),
      type: input.type,
      title: createDefaultTitleForAiNoteType(input.type),
      content: '',
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      oneOnOneRunIds: [],
      relatedSummaryIds: [],
    });

    await this.client.putItem(toNoteItem(userId, note));
    return note;
  }

  async updateAiJournalNote(userId: string, noteId: string, input: UpdateAiJournalNoteInput) {
    const current = await this.client.getItem<AiJournalNoteItem>({
      PK: toUserPk(userId),
      SK: toNoteSk(noteId),
    });

    if (!current?.note) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = normalizeAiJournalNote({
      ...current.note,
      type: input.type,
      title: input.title.trim(),
      content: input.content,
      updatedAt: now,
      lastSavedAt: now,
    });

    await this.client.putItem(toNoteItem(userId, updated));
    return updated;
  }

  async attachRunToNotes(userId: string, noteIds: string[], runId: string) {
    if (noteIds.length === 0) {
      return;
    }

    const items = await this.client.batchGetItems<AiJournalNoteItem>(
      noteIds.map((noteId) => ({
        PK: toUserPk(userId),
        SK: toNoteSk(noteId),
      }))
    );

    const now = new Date().toISOString();
    await Promise.all(
      items
        .filter((item) => item.entityType === 'AI_NOTE')
        .map((item) => {
          const next = normalizeAiJournalNote({
            ...item.note,
            oneOnOneRunIds: item.note.oneOnOneRunIds.includes(runId)
              ? item.note.oneOnOneRunIds
              : [runId, ...item.note.oneOnOneRunIds],
            updatedAt: now,
          });
          return this.client.putItem(toNoteItem(userId, next));
        })
    );
  }

  async importOneOnOneSummary(userId: string, input: ImportOneOnOneSummaryInput) {
    const now = new Date().toISOString();
    const summaryNote = normalizeAiJournalNote({
      id: crypto.randomUUID(),
      type: 'OneOnOneSummary',
      title: input.summary.title.trim(),
      content: input.summary.markdown,
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      oneOnOneRunIds: [input.runId],
      relatedSummaryIds: [],
      sourceRunId: input.runId,
      targetNoteIds: input.targetNoteIds,
      contextSummaryIds: input.contextSummaryIds,
      changesSincePrevious: input.changesSincePrevious,
      continuingThemes: input.continuingThemes,
      newThemes: input.newThemes,
      nextQuestions: input.nextQuestions,
    });

    await this.client.putItem(toNoteItem(userId, summaryNote));

    if (input.targetNoteIds.length > 0) {
      const items = await this.client.batchGetItems<AiJournalNoteItem>(
        input.targetNoteIds.map((noteId) => ({
          PK: toUserPk(userId),
          SK: toNoteSk(noteId),
        }))
      );

      await Promise.all(
        items
          .filter((item) => item.entityType === 'AI_NOTE')
          .map((item) => {
            const next = normalizeAiJournalNote({
              ...item.note,
              relatedSummaryIds: item.note.relatedSummaryIds.includes(summaryNote.id)
                ? item.note.relatedSummaryIds
                : [summaryNote.id, ...item.note.relatedSummaryIds],
              updatedAt: now,
            });
            return this.client.putItem(toNoteItem(userId, next));
          })
      );
    }

    return summaryNote;
  }

  async importBookProperties(userId: string, noteId: string, book: BookProperties) {
    const current = await this.client.getItem<AiJournalNoteItem>({
      PK: toUserPk(userId),
      SK: toNoteSk(noteId),
    });

    if (!current?.note) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = normalizeAiJournalNote({
      ...current.note,
      book,
      updatedAt: now,
      lastSavedAt: now,
    });

    await this.client.putItem(toNoteItem(userId, updated));
    return updated;
  }

  async getOneOnOneSnapshot(userId: string) {
    const items = await this.client.queryByPrefix<OneOnOneRunItem>(toUserPk(userId), 'AI_ONE_ON_ONE_RUN#');
    return normalizeOneOnOneSnapshot({
      runs: items
        .filter((item) => item.entityType === 'AI_ONE_ON_ONE_RUN')
        .map((item) => normalizeOneOnOneRun(item.run)),
    });
  }

  async createOneOnOneRun(userId: string, input: CreateOneOnOneRunInput) {
    const snapshot = await this.getOneOnOneSnapshot(userId);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10).replaceAll('-', '');
    const sequence = snapshot.runs.filter((run) => run.id.startsWith(`oneonone-${todayKey}-`)).length + 1;
    const run = normalizeOneOnOneRun({
      id: createOneOnOneRunId(now, sequence),
      createdAt: now.toISOString(),
      targetNoteIds: input.targetNoteIds,
      contextSummaryIds: input.contextSummaryIds,
      promptText: input.promptText,
      status: 'prompt_created',
    });

    await this.client.putItem(toRunItem(userId, run));
    return run;
  }

  async markOneOnOneRunSummarized(userId: string, runId: string, summaryNoteId: string) {
    const current = await this.client.getItem<OneOnOneRunItem>({
      PK: toUserPk(userId),
      SK: toRunSk(runId),
    });

    if (!current?.run) {
      return null;
    }

    const updated = normalizeOneOnOneRun({
      ...current.run,
      summaryNoteId,
      status: 'summarized',
    });

    await this.client.putItem(toRunItem(userId, updated));
    return updated;
  }
}
