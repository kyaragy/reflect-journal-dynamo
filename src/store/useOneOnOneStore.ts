import { create } from 'zustand';
import { buildOneOnOnePrompt, parseImportedOneOnOneSummary } from '../domain/oneOnOne';
import { aiJournalRepository } from '../repositories';
import { useAiJournalStore } from './useAiJournalStore';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

type OneOnOneState = {
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  latestPromptText: string;
  latestSummaryNoteId: string | null;
  initialize: () => Promise<void>;
  createPromptRun: (targetNoteIds: string[], contextSummaryIds: string[]) => Promise<string>;
  importSummaryJson: (rawJson: string) => Promise<{ summaryNoteId: string }>;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

const withSaving = async <T>(
  set: (fn: (state: OneOnOneState) => Partial<OneOnOneState>) => void,
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

export const useOneOnOneStore = create<OneOnOneState>()((set, get) => ({
  loading: false,
  saving: false,
  initialLoadStatus: 'idle',
  error: null,
  latestPromptText: '',
  latestSummaryNoteId: null,

  async initialize() {
    if (get().initialLoadStatus === 'ready') {
      return;
    }

    set(() => ({
      loading: false,
      error: null,
      initialLoadStatus: 'ready',
    }));
  },

  async createPromptRun(targetNoteIds, contextSummaryIds) {
    return withSaving(set, async () => {
      const notes = useAiJournalStore.getState().notes;
      const targetNotes = notes.filter((note) => targetNoteIds.includes(note.id));
      const contextNotes = notes.filter((note) => contextSummaryIds.includes(note.id));
      const promptText = buildOneOnOnePrompt(targetNotes, contextNotes);

      set(() => ({
        latestPromptText: promptText,
      }));

      return promptText;
    });
  },

  async importSummaryJson(rawJson) {
    return withSaving(set, async () => {
      const payload = parseImportedOneOnOneSummary(rawJson);
      const noteIds = new Set(useAiJournalStore.getState().notes.map((note) => note.id));
      const missingTargetIds = payload.targetNoteIds.filter((noteId) => !noteIds.has(noteId));
      const missingContextIds = payload.contextSummaryIds.filter((noteId) => !noteIds.has(noteId));
      if (missingTargetIds.length > 0 || missingContextIds.length > 0) {
        throw new Error('JSON内の noteId に未登録のノートが含まれています。');
      }

      const summaryNote = await aiJournalRepository.importOneOnOneSummary(payload);
      await useAiJournalStore.getState().reload();

      set(() => ({
        latestSummaryNoteId: summaryNote.id,
      }));

      return {
        summaryNoteId: summaryNote.id,
      };
    });
  },
}));
