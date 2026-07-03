import type {
  AiJournalNote,
  AiJournalSnapshot,
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../domain/aiJournal';
import type { BookProperties } from '../domain/book';
import type { ImportOneOnOneSummaryInput } from '../domain/oneOnOne';
import type { ApiSuccessResponse } from './journalApi';

export type GetAiJournalSnapshotResponse = ApiSuccessResponse<AiJournalSnapshot>;
export type PostAiJournalNoteRequest = CreateAiJournalNoteInput;
export type PostAiJournalNoteResponse = ApiSuccessResponse<AiJournalNote>;
export type PutAiJournalNoteRequest = UpdateAiJournalNoteInput;
export type PutAiJournalNoteResponse = ApiSuccessResponse<AiJournalNote | null>;
export type DeleteAiJournalNoteResponse = ApiSuccessResponse<{ deleted: true }>;
export type PostImportOneOnOneSummaryRequest = ImportOneOnOneSummaryInput;
export type PostImportOneOnOneSummaryResponse = ApiSuccessResponse<AiJournalNote>;
export type PutBookPropertiesRequest = {
  book: BookProperties;
};
export type PutBookPropertiesResponse = ApiSuccessResponse<AiJournalNote | null>;

export const assertAiJournalNoteId = (noteId: string) => {
  if (!noteId.trim()) {
    throw new Error('Invalid noteId: expected non-empty string');
  }
};

export const aiJournalApiPaths = {
  notes: () => '/ai-journal/notes',
  note: (noteId: string) => `/ai-journal/notes/${noteId}`,
  noteBookProperties: (noteId: string) => `/ai-journal/notes/${noteId}/book-properties`,
  importOneOnOneSummary: () => '/ai-journal/notes/import-one-on-one-summary',
} as const;
