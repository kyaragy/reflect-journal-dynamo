import type {
  CreateThinkingMemoCardInput,
  ThinkingDayRecord,
  ThinkingMonthRecord,
  ThinkingWeekRecord,
  ThinkingReflectionResult,
  MonthlyReflectionResult,
  MonthlyUserNote,
  UpdateThinkingMemoCardInput,
  UpsertThinkingQuestionResponseInput,
  WeeklyReflectionResult,
  WeeklyUserNote,
} from '../domain/thinkingReflection';

export interface ThinkingReflectionRepository {
  getDay(date: string): Promise<ThinkingDayRecord | null>;
  getMonth(monthKey: string): Promise<ThinkingMonthRecord>;
  getWeek(weekStart: string): Promise<ThinkingWeekRecord>;
  createMemoCard(date: string, input: CreateThinkingMemoCardInput): Promise<ThinkingDayRecord>;
  updateMemoCard(date: string, memoCardId: string, input: UpdateThinkingMemoCardInput): Promise<ThinkingDayRecord>;
  deleteMemoCard(date: string, memoCardId: string): Promise<void>;
  saveThinkingReflection(date: string, reflection: ThinkingReflectionResult): Promise<ThinkingDayRecord>;
  saveQuestionResponses(date: string, questionResponses: UpsertThinkingQuestionResponseInput[]): Promise<ThinkingDayRecord>;
  saveWeeklyReflection(weekStart: string, reflection: WeeklyReflectionResult): Promise<ThinkingWeekRecord>;
  saveWeeklyUserNote(weekStart: string, userNote: WeeklyUserNote): Promise<ThinkingWeekRecord>;
  saveMonthlyReflection(monthKey: string, reflection: MonthlyReflectionResult): Promise<ThinkingMonthRecord>;
  saveMonthlyUserNote(monthKey: string, userNote: MonthlyUserNote): Promise<ThinkingMonthRecord>;
}
