import type {
  CreateThinkingEntryInput,
  ThinkingDayRecord,
  ThinkingMonthRecord,
  ThinkingWeekRecord,
  ThinkingReflectionResult,
  MonthlyReflectionResult,
  MonthlyUserNote,
  UpdateThinkingEntryInput,
  UpsertThinkingQuestionResponseInput,
  WeeklyReflectionResult,
  WeeklyUserNote,
} from '../domain/thinkingReflection';

export interface ThinkingReflectionRepository {
  getDay(date: string): Promise<ThinkingDayRecord | null>;
  getMonth(monthKey: string): Promise<ThinkingMonthRecord>;
  getWeek(weekStart: string): Promise<ThinkingWeekRecord>;
  createEntry(date: string, input: CreateThinkingEntryInput): Promise<ThinkingDayRecord>;
  updateEntry(date: string, entryId: string, input: UpdateThinkingEntryInput): Promise<ThinkingDayRecord>;
  deleteEntry(date: string, entryId: string): Promise<void>;
  saveThinkingReflection(date: string, reflection: ThinkingReflectionResult): Promise<ThinkingDayRecord>;
  saveQuestionResponses(date: string, questionResponses: UpsertThinkingQuestionResponseInput[]): Promise<ThinkingDayRecord>;
  saveWeeklyReflection(weekStart: string, reflection: WeeklyReflectionResult): Promise<ThinkingWeekRecord>;
  saveWeeklyUserNote(weekStart: string, userNote: WeeklyUserNote): Promise<ThinkingWeekRecord>;
  saveMonthlyReflection(monthKey: string, reflection: MonthlyReflectionResult): Promise<ThinkingMonthRecord>;
  saveMonthlyUserNote(monthKey: string, userNote: MonthlyUserNote): Promise<ThinkingMonthRecord>;
}
