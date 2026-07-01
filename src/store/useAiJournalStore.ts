import { create } from 'zustand';
import {
  sortAiJournalNotes,
  type AiJournalNote,
  type AiNoteType,
  type CreateAiJournalNoteInput,
  type UpdateAiJournalNoteInput,
} from '../domain/aiJournal';
import { parseImportedBookProperties, type BookProperties } from '../domain/book';
import { aiJournalRepository } from '../repositories';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

type AiJournalState = {
  notes: AiJournalNote[];
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  initialize: () => Promise<void>;
  reload: () => Promise<void>;
  createNote: (type: CreateAiJournalNoteInput['type']) => Promise<AiJournalNote>;
  saveNote: (noteId: string, input: UpdateAiJournalNoteInput) => Promise<AiJournalNote | null>;
  importBookProperties: (rawJson: string) => Promise<AiJournalNote | null>;
  updateBookProperties: (noteId: string, book: BookProperties) => Promise<AiJournalNote | null>;
  markNotesUsedInRun: (noteIds: string[], runId: string) => void;
  getNoteById: (noteId: string) => AiJournalNote | undefined;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

const withSaving = async <T>(
  set: (fn: (state: AiJournalState) => Partial<AiJournalState>) => void,
  work: () => Promise<T>
) => {
  set(() => ({ saving: true, error: null }));

  try {
    const result = await work();
    set(() => ({ saving: false }));
    return result;
  } catch (error) {
    set(() => ({ saving: false, error: toErrorMessage(error) }));
    throw error;
  }
};

export const useAiJournalStore = create<AiJournalState>()((set, get) => ({
  notes: [],
  loading: false,
  saving: false,
  initialLoadStatus: 'idle',
  error: null,

  async initialize() {
    if (get().initialLoadStatus === 'loading' || get().initialLoadStatus === 'ready') {
      return;
    }

    set(() => ({
      loading: true,
      error: null,
      initialLoadStatus: 'loading',
    }));

    try {
      const snapshot = await aiJournalRepository.getSnapshot();
      set(() => ({
        notes: sortAiJournalNotes(snapshot.notes),
        loading: false,
        initialLoadStatus: 'ready',
      }));
    } catch (error) {
      set(() => ({
        loading: false,
        initialLoadStatus: 'error',
        error: toErrorMessage(error),
      }));
    }
  },

  async reload() {
    try {
      const snapshot = await aiJournalRepository.getSnapshot();
      set(() => ({
        notes: sortAiJournalNotes(snapshot.notes),
        loading: false,
        initialLoadStatus: 'ready',
        error: null,
      }));
    } catch (error) {
      set(() => ({
        loading: false,
        initialLoadStatus: 'error',
        error: toErrorMessage(error),
      }));
    }
  },

  async createNote(type) {
    return withSaving(set, async () => {
      const note = await aiJournalRepository.createNote({ type });
      set((state) => ({
        notes: sortAiJournalNotes([...state.notes, note]),
      }));
      return note;
    });
  },

  async saveNote(noteId, input) {
    return withSaving(set, async () => {
      const note = await aiJournalRepository.updateNote(noteId, input);
      if (note) {
        set((state) => ({
          notes: sortAiJournalNotes(state.notes.map((item) => (item.id === noteId ? note : item))),
        }));
      }
      return note;
    });
  },

  async updateBookProperties(noteId, book) {
    return withSaving(set, async () => {
      const note = await aiJournalRepository.importBookProperties(noteId, book);
      if (note) {
        set((state) => ({
          notes: sortAiJournalNotes(state.notes.map((item) => (item.id === noteId ? note : item))),
        }));
      }
      return note;
    });
  },

  async importBookProperties(rawJson) {
    return withSaving(set, async () => {
      const payload = parseImportedBookProperties(rawJson);
      const current = get().notes.find((note) => note.id === payload.noteId);
      if (!current) {
        throw new Error('noteId に対応する Book ノートが見つかりません。');
      }
      if (current.type !== 'Book') {
        throw new Error('指定された noteId は Book ノートではありません。');
      }

      const note = await aiJournalRepository.importBookProperties(payload.noteId, payload.book);
      if (note) {
        set((state) => ({
          notes: sortAiJournalNotes(state.notes.map((item) => (item.id === note.id ? note : item))),
        }));
      }
      return note;
    });
  },

  markNotesUsedInRun(noteIds, runId) {
    const now = new Date().toISOString();
    set((state) => ({
      notes: sortAiJournalNotes(
        state.notes.map((note) =>
          noteIds.includes(note.id) && !note.oneOnOneRunIds.includes(runId)
            ? {
                ...note,
                oneOnOneRunIds: [runId, ...note.oneOnOneRunIds],
                updatedAt: now,
              }
            : note
        )
      ),
    }));
  },

  getNoteById(noteId) {
    return get().notes.find((note) => note.id === noteId);
  },
}));

export const selectAiNotesByType = (notes: AiJournalNote[], type: AiNoteType) => notes.filter((note) => note.type === type);
