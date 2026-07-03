import type {
  CreateAiJournalNoteInput,
  UpdateAiJournalNoteInput,
} from '../../../src/domain/aiJournal';
import type { BookProperties } from '../../../src/domain/book';
import type { ImportOneOnOneSummaryInput } from '../../../src/domain/oneOnOne';
import type { AiJournalDataRepository } from '../repositories/aiJournalDataRepository';

export class AiJournalService {
  constructor(private readonly repository: AiJournalDataRepository) {}

  getSnapshot(userId: string) {
    return this.repository.getAiJournalSnapshot(userId);
  }

  createNote(userId: string, input: CreateAiJournalNoteInput) {
    return this.repository.createAiJournalNote(userId, input);
  }

  updateNote(userId: string, noteId: string, input: UpdateAiJournalNoteInput) {
    return this.repository.updateAiJournalNote(userId, noteId, input);
  }

  deleteNote(userId: string, noteId: string) {
    return this.repository.deleteAiJournalNote(userId, noteId);
  }

  importOneOnOneSummary(userId: string, input: ImportOneOnOneSummaryInput) {
    return this.repository.importOneOnOneSummary(userId, input);
  }

  importBookProperties(userId: string, noteId: string, book: BookProperties) {
    return this.repository.importBookProperties(userId, noteId, book);
  }
}
