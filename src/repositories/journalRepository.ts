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
  getDay(date: string): Promise<Day | null>;
  saveDay(day: Day): Promise<Day>;
  getWeek(weekKey: string): Promise<WeekRecord>;
  saveWeekSummary(weekKey: string, summary: string): Promise<WeekRecord>;
  getMonth(monthKey: string): Promise<MonthRecord>;
  saveMonthSummary(monthKey: string, summary: string): Promise<MonthRecord>;
  getYear(yearKey: string): Promise<YearRecord>;
  saveYearSummary(yearKey: string, summary: string): Promise<YearRecord>;
  createCard(date: string, card: CreateCardInput): Promise<Card>;
  updateCard(date: string, cardId: string, card: Partial<Card>): Promise<Card | null>;
  deleteCard(date: string, cardId: string): Promise<void>;
  saveDailySummary(date: string, summary: string): Promise<Day>;
  importSnapshot(snapshot: JournalSnapshot): Promise<JournalSnapshot>;
}
