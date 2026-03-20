import type { CreateCardInput, Day, JournalSnapshot } from '../../../src/domain/journal';
import type { JournalDataRepository } from '../repositories/journalRepository';

export class JournalService {
  constructor(private readonly repository: JournalDataRepository) {}

  getDay(userId: string, date: string) {
    return this.repository.getDay(userId, date);
  }

  saveDay(userId: string, date: string, day: Day) {
    return this.repository.saveDay(userId, {
      ...day,
      date,
    });
  }

  saveDailySummary(userId: string, date: string, summary: string) {
    return this.repository.saveDailySummary(userId, date, summary);
  }

  createCard(userId: string, date: string, input: CreateCardInput) {
    return this.repository.createCard(userId, date, input);
  }

  updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    return this.repository.updateCard(userId, date, cardId, input);
  }

  deleteCard(userId: string, date: string, cardId: string) {
    return this.repository.deleteCard(userId, date, cardId);
  }

  getWeek(userId: string, weekKey: string) {
    return this.repository.getWeek(userId, weekKey);
  }

  saveWeekSummary(userId: string, weekKey: string, summary: string) {
    return this.repository.saveWeekSummary(userId, weekKey, summary);
  }

  getMonth(userId: string, monthKey: string) {
    return this.repository.getMonth(userId, monthKey);
  }

  saveMonthSummary(userId: string, monthKey: string, summary: string) {
    return this.repository.saveMonthSummary(userId, monthKey, summary);
  }

  getYear(userId: string, yearKey: string) {
    return this.repository.getYear(userId, yearKey);
  }

  saveYearSummary(userId: string, yearKey: string, summary: string) {
    return this.repository.saveYearSummary(userId, yearKey, summary);
  }

  importSnapshot(userId: string, snapshot: JournalSnapshot) {
    return this.repository.importSnapshot(userId, snapshot);
  }
}
