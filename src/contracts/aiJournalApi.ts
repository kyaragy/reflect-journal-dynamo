import type {
  AiJournalNote,
  AiJournalSnapshot,
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../domain/aiJournal';
import type { BookProperties } from '../domain/book';
import type { ImportOneOnOneSummaryInput, OneOnOneRun, OneOnOneSnapshot } from '../domain/oneOnOne';
import type { ApiSuccessResponse } from './journalApi';

export type GetAiJournalSnapshotResponse = ApiSuccessResponse<AiJournalSnapshot>;
export type PostAiJournalNoteRequest = CreateAiJournalNoteInput;
export type PostAiJournalNoteResponse = ApiSuccessResponse<AiJournalNote>;
export type PutAiJournalNoteRequest = UpdateAiJournalNoteInput;
export type PutAiJournalNoteResponse = ApiSuccessResponse<AiJournalNote | null>;
export type PostAttachRunToNotesRequest = {
  noteIds: string[];
  runId: string;
};
export type PostAttachRunToNotesResponse = ApiSuccessResponse<{ attached: true }>;
export type PostImportOneOnOneSummaryRequest = ImportOneOnOneSummaryInput;
export type PostImportOneOnOneSummaryResponse = ApiSuccessResponse<AiJournalNote>;
export type PutBookPropertiesRequest = {
  book: BookProperties;
};
export type PutBookPropertiesResponse = ApiSuccessResponse<AiJournalNote | null>;

export type GetOneOnOneSnapshotResponse = ApiSuccessResponse<OneOnOneSnapshot>;
export type PostOneOnOneRunRequest = {
  targetNoteIds: string[];
  contextSummaryIds: string[];
  promptText: string;
};
export type PostOneOnOneRunResponse = ApiSuccessResponse<OneOnOneRun>;
export type PutOneOnOneRunSummaryRequest = {
  summaryNoteId: string;
};
export type PutOneOnOneRunSummaryResponse = ApiSuccessResponse<OneOnOneRun | null>;

export const assertAiJournalNoteId = (noteId: string) => {
  if (!noteId.trim()) {
    throw new Error('Invalid noteId: expected non-empty string');
  }
};

export const assertOneOnOneRunId = (runId: string) => {
  if (!runId.trim()) {
    throw new Error('Invalid runId: expected non-empty string');
  }
};

export const aiJournalApiPaths = {
  notes: () => '/ai-journal/notes',
  note: (noteId: string) => `/ai-journal/notes/${noteId}`,
  noteBookProperties: (noteId: string) => `/ai-journal/notes/${noteId}/book-properties`,
  attachRunToNotes: () => '/ai-journal/notes/attach-run',
  importOneOnOneSummary: () => '/ai-journal/notes/import-one-on-one-summary',
  oneOnOneRuns: () => '/ai-journal/one-on-one-runs',
  oneOnOneRunSummary: (runId: string) => `/ai-journal/one-on-one-runs/${runId}/summary`,
} as const;
