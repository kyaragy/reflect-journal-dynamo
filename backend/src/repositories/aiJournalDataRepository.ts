import type {
  AiJournalNote,
  AiJournalSnapshot,
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../../../src/domain/aiJournal';
import type { BookProperties } from '../../../src/domain/book';
import type { ImportOneOnOneSummaryInput, OneOnOneRun, OneOnOneSnapshot } from '../../../src/domain/oneOnOne';
import type { CreateOneOnOneRunInput } from '../../../src/repositories/oneOnOneRepository';

export type AiJournalDataRepository = {
  getAiJournalSnapshot: (userId: string) => Promise<AiJournalSnapshot>;
  createAiJournalNote: (userId: string, input: CreateAiJournalNoteInput) => Promise<AiJournalNote>;
  updateAiJournalNote: (userId: string, noteId: string, input: UpdateAiJournalNoteInput) => Promise<AiJournalNote | null>;
  deleteAiJournalNote: (userId: string, noteId: string) => Promise<{ deleted: true }>;
  attachRunToNotes: (userId: string, noteIds: string[], runId: string) => Promise<void>;
  importOneOnOneSummary: (userId: string, input: ImportOneOnOneSummaryInput) => Promise<AiJournalNote>;
  importBookProperties: (userId: string, noteId: string, book: BookProperties) => Promise<AiJournalNote | null>;
  getOneOnOneSnapshot: (userId: string) => Promise<OneOnOneSnapshot>;
  createOneOnOneRun: (userId: string, input: CreateOneOnOneRunInput) => Promise<OneOnOneRun>;
  markOneOnOneRunSummarized: (userId: string, runId: string, summaryNoteId: string) => Promise<OneOnOneRun | null>;
};
