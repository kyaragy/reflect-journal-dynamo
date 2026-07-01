import {
  createEmptyOneOnOneSnapshot,
  createOneOnOneRunId,
  normalizeOneOnOneSnapshot,
  type OneOnOneRun,
  type OneOnOneSnapshot,
} from '../domain/oneOnOne';
import type { CreateOneOnOneRunInput, OneOnOneRepository } from './oneOnOneRepository';

const STORAGE_KEY = 'reflect-journal-one-on-one-storage';
const DEMO_RUN_IDS = new Set(['oneonone-20260629-001', 'oneonone-20260622-001']);
const DEMO_PROMPTS = new Set(['Demo prompt for 1on1 summary review.', 'Older demo prompt.']);

const stripDemoRuns = (snapshot: OneOnOneSnapshot): OneOnOneSnapshot => ({
  runs: snapshot.runs.filter((run) => !DEMO_RUN_IDS.has(run.id) && !DEMO_PROMPTS.has(run.promptText)),
});

const readSnapshot = (): OneOnOneSnapshot => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyOneOnOneSnapshot();
  }

  try {
    const normalized = normalizeOneOnOneSnapshot(JSON.parse(raw) as OneOnOneSnapshot);
    const cleaned = stripDemoRuns(normalized);
    if (cleaned.runs.length !== normalized.runs.length) {
      writeSnapshot(cleaned);
    }
    return cleaned;
  } catch {
    return createEmptyOneOnOneSnapshot();
  }
};

const writeSnapshot = (snapshot: OneOnOneSnapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeOneOnOneSnapshot(snapshot)));
};

export const localStorageOneOnOneRepository: OneOnOneRepository = {
  async getSnapshot() {
    return readSnapshot();
  },

  async replaceSnapshot(snapshot) {
    writeSnapshot(snapshot);
  },

  async createRun(input) {
    const snapshot = readSnapshot();
    const now = new Date();
    const run: OneOnOneRun = {
      id: createOneOnOneRunId(now, snapshot.runs.length + 1),
      createdAt: now.toISOString(),
      targetNoteIds: input.targetNoteIds,
      contextSummaryIds: input.contextSummaryIds,
      promptText: input.promptText,
      status: 'prompt_created',
    };

    writeSnapshot({
      runs: [run, ...snapshot.runs],
    });
    return run;
  },

  async markRunSummarized(runId, summaryNoteId) {
    const snapshot = readSnapshot();
    const current = snapshot.runs.find((run) => run.id === runId);
    if (!current) {
      return null;
    }

    const updated: OneOnOneRun = {
      ...current,
      summaryNoteId,
      status: 'summarized',
    };

    writeSnapshot({
      runs: snapshot.runs.map((run) => (run.id === runId ? updated : run)),
    });
    return updated;
  },
};
