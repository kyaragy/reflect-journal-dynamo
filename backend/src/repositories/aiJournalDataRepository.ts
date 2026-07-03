import type {
  AiJournalNote,
  AiJournalSnapshot,
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../../../src/domain/aiJournal';
import type { BookProperties } from '../../../src/domain/book';
import type { ImportOneOnOneSummaryInput } from '../../../src/domain/oneOnOne';

export type AiJournalDataRepository = {
  getAiJournalSnapshot: (userId: string) => Promise<AiJournalSnapshot>;
  createAiJournalNote: (userId: string, input: CreateAiJournalNoteInput) => Promise<AiJournalNote>;
  updateAiJournalNote: (userId: string, noteId: string, input: UpdateAiJournalNoteInput) => Promise<AiJournalNote | null>;
  deleteAiJournalNote: (userId: string, noteId: string) => Promise<{ deleted: true }>;
  importOneOnOneSummary: (userId: string, input: ImportOneOnOneSummaryInput) => Promise<AiJournalNote>;
  importBookProperties: (userId: string, noteId: string, book: BookProperties) => Promise<AiJournalNote | null>;
};
