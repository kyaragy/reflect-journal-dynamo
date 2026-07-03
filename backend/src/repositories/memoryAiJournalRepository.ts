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
import { type ImportOneOnOneSummaryInput } from '../../../src/domain/oneOnOne';
import type { AiJournalDataRepository } from './aiJournalDataRepository';

type MemoryAiJournalState = {
  notes: ReturnType<typeof createEmptyAiJournalSnapshot>;
};

const createEmptyState = (): MemoryAiJournalState => ({
  notes: createEmptyAiJournalSnapshot(),
});

export class MemoryAiJournalRepository implements AiJournalDataRepository {
  private readonly stateByUser = new Map<string, MemoryAiJournalState>();

  private getState(userId: string) {
    const current = this.stateByUser.get(userId);
    if (current) {
      return current;
    }

    const initial = createEmptyState();
    this.stateByUser.set(userId, initial);
    return initial;
  }

  async getAiJournalSnapshot(userId: string) {
    return normalizeAiJournalSnapshot(this.getState(userId).notes);
  }

  async createAiJournalNote(userId: string, input: CreateAiJournalNoteInput) {
    const state = this.getState(userId);
    const now = new Date().toISOString();
    const note: AiJournalNote = normalizeAiJournalNote({
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

    state.notes = normalizeAiJournalSnapshot({
      notes: [...state.notes.notes, note],
    });
    return note;
  }

  async updateAiJournalNote(userId: string, noteId: string, input: UpdateAiJournalNoteInput) {
    const state = this.getState(userId);
    const current = state.notes.notes.find((note) => note.id === noteId);
    if (!current) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = normalizeAiJournalNote({
      ...current,
      type: input.type,
      title: input.title.trim(),
      content: input.content,
      updatedAt: now,
      lastSavedAt: now,
    });

    state.notes = normalizeAiJournalSnapshot({
      notes: state.notes.notes.map((note) => (note.id === noteId ? updated : note)),
    });
    return updated;
  }

  async deleteAiJournalNote(userId: string, noteId: string) {
    const state = this.getState(userId);
    state.notes = normalizeAiJournalSnapshot({
      notes: state.notes.notes
        .filter((note) => note.id !== noteId)
        .map((note) =>
          normalizeAiJournalNote({
            ...note,
            relatedSummaryIds: note.relatedSummaryIds.filter((summaryId) => summaryId !== noteId),
            targetNoteIds: note.targetNoteIds?.filter((targetId) => targetId !== noteId) ?? [],
            contextSummaryIds: note.contextSummaryIds?.filter((summaryId) => summaryId !== noteId) ?? [],
          })
        ),
    });
    return { deleted: true as const };
  }

  async importOneOnOneSummary(userId: string, input: ImportOneOnOneSummaryInput) {
    const state = this.getState(userId);
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

    state.notes = normalizeAiJournalSnapshot({
      notes: [
        ...state.notes.notes.map((note) =>
          input.targetNoteIds.includes(note.id)
            ? normalizeAiJournalNote({
                ...note,
                relatedSummaryIds: note.relatedSummaryIds.includes(summaryNote.id)
                  ? note.relatedSummaryIds
                  : [summaryNote.id, ...note.relatedSummaryIds],
                updatedAt: now,
              })
            : note
        ),
        summaryNote,
      ],
    });

    return summaryNote;
  }

  async importBookProperties(userId: string, noteId: string, book: BookProperties) {
    const state = this.getState(userId);
    const current = state.notes.notes.find((note) => note.id === noteId);
    if (!current) {
      return null;
    }

    const now = new Date().toISOString();
    const updated = normalizeAiJournalNote({
      ...current,
      book,
      updatedAt: now,
      lastSavedAt: now,
    });

    state.notes = normalizeAiJournalSnapshot({
      notes: state.notes.notes.map((note) => (note.id === noteId ? updated : note)),
    });
    return updated;
  }
}
