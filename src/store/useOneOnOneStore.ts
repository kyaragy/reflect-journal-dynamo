import { create } from 'zustand';
import { buildOneOnOnePrompt, parseImportedOneOnOneSummary, sortOneOnOneRuns, type OneOnOneRun } from '../domain/oneOnOne';
import { aiJournalRepository, oneOnOneRepository } from '../repositories';
import { useAiJournalStore } from './useAiJournalStore';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

type OneOnOneState = {
  runs: OneOnOneRun[];
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  latestRunId: string | null;
  latestPromptText: string;
  latestSummaryNoteId: string | null;
  initialize: () => Promise<void>;
  createPromptRun: (targetNoteIds: string[], contextSummaryIds: string[]) => Promise<OneOnOneRun>;
  importSummaryJson: (rawJson: string) => Promise<{ run: OneOnOneRun; summaryNoteId: string }>;
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
  runs: [],
  loading: false,
  saving: false,
  initialLoadStatus: 'idle',
  error: null,
  latestRunId: null,
  latestPromptText: '',
  latestSummaryNoteId: null,

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
      const snapshot = await oneOnOneRepository.getSnapshot();
      set(() => ({
        runs: sortOneOnOneRuns(snapshot.runs),
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

  async createPromptRun(targetNoteIds, contextSummaryIds) {
    return withSaving(set, async () => {
      const notes = useAiJournalStore.getState().notes;
      const targetNotes = notes.filter((note) => targetNoteIds.includes(note.id));
      const contextNotes = notes.filter((note) => contextSummaryIds.includes(note.id));
      const nextSequence = get().runs.length + 1;
      const runIdPreview = `oneonone-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(nextSequence).padStart(3, '0')}`;
      const promptText = buildOneOnOnePrompt(runIdPreview, targetNotes, contextNotes);
      const run = await oneOnOneRepository.createRun({
        targetNoteIds,
        contextSummaryIds,
        promptText,
      });

      await aiJournalRepository.attachRunToNotes(targetNoteIds, run.id);
      useAiJournalStore.getState().markNotesUsedInRun(targetNoteIds, run.id);

      set((state) => ({
        runs: sortOneOnOneRuns([run, ...state.runs.filter((item) => item.id !== run.id)]),
        latestRunId: run.id,
        latestPromptText: run.promptText,
      }));
      return run;
    });
  },

  async importSummaryJson(rawJson) {
    return withSaving(set, async () => {
      const payload = parseImportedOneOnOneSummary(rawJson);
      const currentRun = get().runs.find((run) => run.id === payload.runId);
      if (!currentRun) {
        throw new Error('runId に対応する1on1実行履歴が見つかりません。');
      }

      const noteIds = new Set(useAiJournalStore.getState().notes.map((note) => note.id));
      const missingTargetIds = payload.targetNoteIds.filter((noteId) => !noteIds.has(noteId));
      const missingContextIds = payload.contextSummaryIds.filter((noteId) => !noteIds.has(noteId));
      if (missingTargetIds.length > 0 || missingContextIds.length > 0) {
        throw new Error('JSON内の noteId に未登録のノートが含まれています。');
      }

      if (JSON.stringify([...currentRun.targetNoteIds].sort()) !== JSON.stringify([...payload.targetNoteIds].sort())) {
        throw new Error('targetNoteIds が対象Runと一致しません。');
      }

      if (JSON.stringify([...currentRun.contextSummaryIds].sort()) !== JSON.stringify([...payload.contextSummaryIds].sort())) {
        throw new Error('contextSummaryIds が対象Runと一致しません。');
      }

      const summaryNote = await aiJournalRepository.importOneOnOneSummary(payload);
      const updatedRun = await oneOnOneRepository.markRunSummarized(payload.runId, summaryNote.id);
      if (!updatedRun) {
        throw new Error('1on1実行履歴の更新に失敗しました。');
      }

      await useAiJournalStore.getState().reload();

      set((state) => ({
        runs: sortOneOnOneRuns(state.runs.map((run) => (run.id === updatedRun.id ? updatedRun : run))),
        latestRunId: updatedRun.id,
        latestSummaryNoteId: summaryNote.id,
      }));

      return {
        run: updatedRun,
        summaryNoteId: summaryNote.id,
      };
    });
  },
}));
