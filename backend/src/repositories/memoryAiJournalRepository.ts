import {
  createDefaultTitleForAiNoteType,
  createEmptyAiJournalSnapshot,
  normalizeAiJournalNote,
  normalizeAiJournalSnapshot,
  type AiJournalNote,
  type AiJournalSnapshot,
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
  type OneOnOneSnapshot,
} from '../../../src/domain/oneOnOne';
import type { CreateOneOnOneRunInput } from '../../../src/repositories/oneOnOneRepository';
import type { AiJournalDataRepository } from './aiJournalDataRepository';

type MemoryAiJournalState = {
  notes: AiJournalSnapshot;
  runs: OneOnOneSnapshot;
};

const createEmptyState = (): MemoryAiJournalState => ({
  notes: createEmptyAiJournalSnapshot(),
  runs: createEmptyOneOnOneSnapshot(),
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

  async attachRunToNotes(userId: string, noteIds: string[], runId: string) {
    const state = this.getState(userId);
    const now = new Date().toISOString();
    state.notes = normalizeAiJournalSnapshot({
      notes: state.notes.notes.map((note) =>
        noteIds.includes(note.id) && !note.oneOnOneRunIds.includes(runId)
          ? normalizeAiJournalNote({
              ...note,
              oneOnOneRunIds: [runId, ...note.oneOnOneRunIds],
              updatedAt: now,
            })
          : note
      ),
    });
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

  async getOneOnOneSnapshot(userId: string) {
    return normalizeOneOnOneSnapshot(this.getState(userId).runs);
  }

  async createOneOnOneRun(userId: string, input: CreateOneOnOneRunInput) {
    const state = this.getState(userId);
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10).replaceAll('-', '');
    const sequence =
      state.runs.runs.filter((run) => run.id.startsWith(`oneonone-${todayKey}-`)).length + 1;
    const run: OneOnOneRun = normalizeOneOnOneRun({
      id: createOneOnOneRunId(now, sequence),
      createdAt: now.toISOString(),
      targetNoteIds: input.targetNoteIds,
      contextSummaryIds: input.contextSummaryIds,
      promptText: input.promptText,
      status: 'prompt_created',
    });

    state.runs = normalizeOneOnOneSnapshot({
      runs: [run, ...state.runs.runs],
    });
    return run;
  }

  async markOneOnOneRunSummarized(userId: string, runId: string, summaryNoteId: string) {
    const state = this.getState(userId);
    const current = state.runs.runs.find((run) => run.id === runId);
    if (!current) {
      return null;
    }

    const updated = normalizeOneOnOneRun({
      ...current,
      summaryNoteId,
      status: 'summarized',
    });

    state.runs = normalizeOneOnOneSnapshot({
      runs: state.runs.runs.map((run) => (run.id === runId ? updated : run)),
    });
    return updated;
  }
}
