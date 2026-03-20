import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../../../src/domain/journal';

export interface JournalDataRepository {
  getDay(userId: string, date: string): Promise<Day | null>;
  saveDay(userId: string, day: Day): Promise<Day>;
  saveDailySummary(userId: string, date: string, summary: string): Promise<Day>;
  createCard(userId: string, date: string, input: CreateCardInput): Promise<Card>;
  updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>): Promise<Card | null>;
  deleteCard(userId: string, date: string, cardId: string): Promise<void>;
  getWeek(userId: string, weekKey: string): Promise<WeekRecord>;
  saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord>;
  getMonth(userId: string, monthKey: string): Promise<MonthRecord>;
  saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord>;
  getYear(userId: string, yearKey: string): Promise<YearRecord>;
  saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord>;
  importSnapshot(userId: string, snapshot: JournalSnapshot): Promise<JournalSnapshot>;
}
