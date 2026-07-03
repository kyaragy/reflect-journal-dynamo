import {
  createDefaultTitleForAiNoteType,
  normalizeAiJournalNote,
  normalizeAiJournalSnapshot,
  type AiJournalNote,
  type CreateAiJournalNoteInput,
  type UpdateAiJournalNoteInput,
} from '../../../src/domain/aiJournal';
import type { BookProperties } from '../../../src/domain/book';
import { type ImportOneOnOneSummaryInput } from '../../../src/domain/oneOnOne';
import { DynamoDbClient } from '../db/dynamoDbClient';
import type { AiJournalDataRepository } from './aiJournalDataRepository';

type AiJournalNoteItem = {
  PK: string;
  SK: string;
  entityType: 'AI_NOTE';
  note: AiJournalNote;
  updatedAt: string;
};

const toUserPk = (userId: string) => `USER#${userId}`;
const toNoteSk = (noteId: string) => `AI_NOTE#${noteId}`;

const toNoteItem = (userId: string, note: AiJournalNote): AiJournalNoteItem => ({
  PK: toUserPk(userId),
  SK: toNoteSk(note.id),
  entityType: 'AI_NOTE',
  note,
  updatedAt: note.updatedAt,
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

  async deleteAiJournalNote(userId: string, noteId: string) {
    const snapshot = await this.getAiJournalSnapshot(userId);

    await this.client.deleteItem({
      PK: toUserPk(userId),
      SK: toNoteSk(noteId),
    });

    const affectedNotes = snapshot.notes.filter(
      (note) =>
        note.id !== noteId &&
        (note.relatedSummaryIds.includes(noteId) ||
          (note.targetNoteIds ?? []).includes(noteId) ||
          (note.contextSummaryIds ?? []).includes(noteId))
    );

    await Promise.all(
      affectedNotes.map((note) =>
        this.client.putItem(
          toNoteItem(
            userId,
            normalizeAiJournalNote({
              ...note,
              relatedSummaryIds: note.relatedSummaryIds.filter((summaryId) => summaryId !== noteId),
              targetNoteIds: note.targetNoteIds?.filter((targetId) => targetId !== noteId) ?? [],
              contextSummaryIds: note.contextSummaryIds?.filter((summaryId) => summaryId !== noteId) ?? [],
            })
          )
        )
      )
    );

    return { deleted: true as const };
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
      oneOnOneRunIds: [],
      relatedSummaryIds: [],
      targetNoteIds: input.targetNoteIds,
      contextSummaryIds: input.contextSummaryIds,
      discussedThemes: input.discussedThemes,
      notableQuotes: input.notableQuotes,
      insights: input.insights,
      nextActions: input.nextActions,
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
}
