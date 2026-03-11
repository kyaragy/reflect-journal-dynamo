import type {
  CreateCardInput,
  Card,
  Day,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../domain/journal';

export interface JournalRepository {
  getState(): JournalSnapshot;
  getDay(date: string): Day | null;
  saveDay(day: Day): void;
  getWeek(weekKey: string): WeekRecord;
  saveWeekSummary(weekKey: string, summary: string): void;
  getMonth(monthKey: string): MonthRecord;
  saveMonthSummary(monthKey: string, summary: string): void;
  getYear(yearKey: string): YearRecord;
  saveYearSummary(yearKey: string, summary: string): void;
  createCard(date: string, card: CreateCardInput): Card;
  updateCard(date: string, cardId: string, card: Partial<Card>): Card | null;
  deleteCard(date: string, cardId: string): void;
  saveDailySummary(date: string, summary: string): void;
}
