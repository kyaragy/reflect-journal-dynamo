import type {
  CreateJournalCardInput,
  DailySummary,
  DayRecord,
  JournalEntry,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../domain/journal';

export interface JournalRepository {
  getState(): JournalSnapshot;
  getDay(date: string): DayRecord;
  saveDay(day: DayRecord): void;
  getWeek(weekKey: string): WeekRecord;
  saveWeekSummary(weekKey: string, summary: string): void;
  getMonth(monthKey: string): MonthRecord;
  saveMonthSummary(monthKey: string, summary: string): void;
  getYear(yearKey: string): YearRecord;
  saveYearSummary(yearKey: string, summary: string): void;
  createCard(date: string, card: CreateJournalCardInput): JournalEntry;
  updateCard(date: string, cardId: string, card: Partial<JournalEntry>): JournalEntry | null;
  deleteCard(date: string, cardId: string): void;
  saveDailySummary(date: string, summary: DailySummary): void;
}
