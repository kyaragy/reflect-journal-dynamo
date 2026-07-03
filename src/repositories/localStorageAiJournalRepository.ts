import {
  createDefaultTitleForAiNoteType,
  createEmptyAiJournalSnapshot,
  normalizeAiJournalSnapshot,
  sortAiJournalNotes,
  type AiJournalNote,
  type AiJournalSnapshot,
  type CreateAiJournalNoteInput,
  type UpdateAiJournalNoteInput,
} from '../domain/aiJournal';
import type { BookProperties } from '../domain/book';
import type { ImportOneOnOneSummaryInput } from '../domain/oneOnOne';
import type { AiJournalRepository } from './aiJournalRepository';

const STORAGE_KEY = 'reflect-journal-ai-journal-storage';
const DEMO_NOTE_ID_PREFIXES = ['demo-note-', 'demo-summary-'];

const isDemoNote = (note: AiJournalNote) =>
  DEMO_NOTE_ID_PREFIXES.some((prefix) => note.id.startsWith(prefix)) ||
  note.sourceRunId === 'oneonone-20260629-001' ||
  note.sourceRunId === 'oneonone-20260622-001';

const stripDemoNotes = (snapshot: AiJournalSnapshot): AiJournalSnapshot => {
  const filteredNotes = snapshot.notes.filter((note) => !isDemoNote(note));
  if (filteredNotes.length === snapshot.notes.length) {
    return snapshot;
  }

  return normalizeAiJournalSnapshot({
    notes: filteredNotes.map((note) => ({
      ...note,
      relatedSummaryIds: note.relatedSummaryIds.filter((summaryId) => !summaryId.startsWith('demo-summary-')),
    })),
  });
};

const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const readSnapshot = (): AiJournalSnapshot => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyAiJournalSnapshot();
  }

  try {
    const normalized = normalizeAiJournalSnapshot(JSON.parse(raw) as AiJournalSnapshot);
    const cleaned = stripDemoNotes(normalized);
    if (cleaned.notes.length !== normalized.notes.length) {
      writeSnapshot(cleaned);
    }
    return cleaned;
  } catch {
    return createEmptyAiJournalSnapshot();
  }
};

const writeSnapshot = (snapshot: AiJournalSnapshot) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      notes: sortAiJournalNotes(snapshot.notes),
    })
  );
};

export const localStorageAiJournalRepository: AiJournalRepository = {
  async getSnapshot() {
    return readSnapshot();
  },

  async replaceSnapshot(snapshot) {
    writeSnapshot(snapshot);
  },

  async createNote(input) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const note: AiJournalNote = {
      id: createId(),
      type: input.type,
      title: createDefaultTitleForAiNoteType(input.type),
      content: '',
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      oneOnOneRunIds: [],
      relatedSummaryIds: [],
    };

    writeSnapshot({
      notes: [...snapshot.notes, note],
    });
    return note;
  },

  async updateNote(noteId, input) {
    const snapshot = readSnapshot();
    const current = snapshot.notes.find((note) => note.id === noteId);
    if (!current) {
      return null;
    }

    const updated: AiJournalNote = {
      ...current,
      type: input.type,
      title: input.title.trim(),
      content: input.content,
      updatedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    };

    writeSnapshot({
      notes: snapshot.notes.map((note) => (note.id === noteId ? updated : note)),
    });
    return updated;
  },

  async deleteNote(noteId) {
    const snapshot = readSnapshot();
    const nextNotes = snapshot.notes
      .filter((note) => note.id !== noteId)
      .map((note) => ({
        ...note,
        relatedSummaryIds: note.relatedSummaryIds.filter((summaryId) => summaryId !== noteId),
        targetNoteIds: note.targetNoteIds?.filter((targetId) => targetId !== noteId) ?? [],
        contextSummaryIds: note.contextSummaryIds?.filter((summaryId) => summaryId !== noteId) ?? [],
      }));

    writeSnapshot({ notes: nextNotes });
    return { deleted: true as const };
  },

  async importOneOnOneSummary(input) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const summaryNote: AiJournalNote = {
      id: createId(),
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
    };

    const nextNotes = snapshot.notes.map((note) =>
      input.targetNoteIds.includes(note.id)
        ? {
            ...note,
            relatedSummaryIds: note.relatedSummaryIds.includes(summaryNote.id)
              ? note.relatedSummaryIds
              : [summaryNote.id, ...note.relatedSummaryIds],
            updatedAt: now,
          }
        : note
    );

    writeSnapshot({
      notes: [...nextNotes, summaryNote],
    });
    return summaryNote;
  },

  async importBookProperties(noteId, book) {
    const snapshot = readSnapshot();
    const current = snapshot.notes.find((note) => note.id === noteId);
    if (!current) {
      return null;
    }

    const updated: AiJournalNote = {
      ...current,
      book,
      updatedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
    };

    writeSnapshot({
      notes: snapshot.notes.map((note) => (note.id === noteId ? updated : note)),
    });
    return updated;
  },
};
