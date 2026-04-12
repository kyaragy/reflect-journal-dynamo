import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../../../src/domain/journal';
import type {
  CreateThinkingMemoCardInput,
  ThinkingDayRecord,
  ThinkingMonthRecord,
  ThinkingWeekRecord,
  ThinkingReflectionResult,
  UpsertThinkingQuestionResponseInput,
  WeeklyReflectionResult,
  WeeklyUserNote,
} from '../../../src/domain/thinkingReflection';

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
  getThinkingDay(userId: string, date: string): Promise<ThinkingDayRecord | null>;
  getThinkingMonth(userId: string, monthKey: string): Promise<ThinkingMonthRecord>;
  getThinkingWeek(userId: string, weekStart: string): Promise<ThinkingWeekRecord>;
  createThinkingMemoCard(userId: string, date: string, input: CreateThinkingMemoCardInput): Promise<ThinkingDayRecord>;
  deleteThinkingMemoCard(userId: string, date: string, memoCardId: string): Promise<void>;
  saveThinkingReflection(userId: string, date: string, reflection: ThinkingReflectionResult): Promise<ThinkingDayRecord>;
  saveThinkingQuestionResponses(userId: string, date: string, questionResponses: UpsertThinkingQuestionResponseInput[]): Promise<ThinkingDayRecord>;
  saveWeeklyReflection(userId: string, weekStart: string, reflection: WeeklyReflectionResult): Promise<ThinkingWeekRecord>;
  saveWeeklyUserNote(userId: string, weekStart: string, userNote: WeeklyUserNote): Promise<ThinkingWeekRecord>;
}
