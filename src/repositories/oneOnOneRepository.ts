import type { OneOnOneRun, OneOnOneSnapshot } from '../domain/oneOnOne';

export type CreateOneOnOneRunInput = {
  targetNoteIds: string[];
  contextSummaryIds: string[];
  promptText: string;
};

export type OneOnOneRepository = {
  getSnapshot: () => Promise<OneOnOneSnapshot>;
  replaceSnapshot: (snapshot: OneOnOneSnapshot) => Promise<void>;
  createRun: (input: CreateOneOnOneRunInput) => Promise<OneOnOneRun>;
  markRunSummarized: (runId: string, summaryNoteId: string) => Promise<OneOnOneRun | null>;
};
