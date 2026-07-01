import type {
  AiJournalNote,
  AiJournalSnapshot,
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../domain/aiJournal';
import type { BookProperties } from '../domain/book';
import type { ImportOneOnOneSummaryInput } from '../domain/oneOnOne';

export type AiJournalRepository = {
  getSnapshot: () => Promise<AiJournalSnapshot>;
  replaceSnapshot: (snapshot: AiJournalSnapshot) => Promise<void>;
  createNote: (input: CreateAiJournalNoteInput) => Promise<AiJournalNote>;
  updateNote: (noteId: string, input: UpdateAiJournalNoteInput) => Promise<AiJournalNote | null>;
  attachRunToNotes: (noteIds: string[], runId: string) => Promise<void>;
  importOneOnOneSummary: (input: ImportOneOnOneSummaryInput) => Promise<AiJournalNote>;
  importBookProperties: (noteId: string, book: BookProperties) => Promise<AiJournalNote | null>;
};
