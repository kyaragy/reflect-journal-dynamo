import { createEmptyJournalSnapshot } from './journal';

export const thinkingReflectionMode = 'thinking' as const;
export type ThinkingReflectionMode = typeof thinkingReflectionMode;

export type ThinkingMemoCard = {
  id: string;
  trigger: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateThinkingMemoCardInput = {
  trigger: string;
  body: string;
};

export type UpdateThinkingMemoCardInput = CreateThinkingMemoCardInput;

export type ThinkingReflectionCard = {
  card_id: string;
  trigger: string;
  thoughts: string[];
  emotions: string[];
  body_reactions: string[];
  actions: string[];
};

export type ThinkingReflectionResult = {
  date: string;
  mode: ThinkingReflectionMode;
  cards: ThinkingReflectionCard[];
  daily_patterns: string[];
  insight_candidates: string[];
  questions: string[];
  importedAt: string;
  rawJson: string;
};

export type ThinkingQuestionResponse = {
  id: string;
  question: string;
  response: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertThinkingQuestionResponseInput = {
  question: string;
  response: string;
};

export type ThinkingDayRecord = {
  date: string;
  memoCards: ThinkingMemoCard[];
  thinkingReflection: ThinkingReflectionResult | null;
  questionResponses: ThinkingQuestionResponse[];
  createdAt: string;
  updatedAt: string;
};

export type ThinkingMonthRecord = {
  monthKey: string;
  days: ThinkingDayRecord[];
};

export type ThinkingWeekAggregateItem = {
  text: string;
  dates: string[];
  count: number;
};

export type ThinkingWeekAggregate = {
  weekKey: string;
  sourceDates: string[];
  patterns: ThinkingWeekAggregateItem[];
  insights: ThinkingWeekAggregateItem[];
};

export type WeeklyRepeatedPattern = {
  pattern: string;
  count: number;
};

export type WeeklyReflectionSourceDay = {
  date: string;
};

export type WeeklyReflectionResult = {
  week_start: string;
  week_end: string;
  mode: 'weekly_reflection';
  weekly_summary: string;
  repeated_patterns: WeeklyRepeatedPattern[];
  notable_changes: string[];
  question_answer_patterns: string[];
  unanswered_question_patterns: string[];
  carry_forward_questions?: string[];
  growing_insights: string[];
  source_days: WeeklyReflectionSourceDay[];
  importedAt: string;
  rawJson: string;
};

export type WeeklyUserNote = {
  week_start: string;
  week_end: string;
  note: string;
  updated_at: string;
};

export type ThinkingWeekRecord = {
  weekStart: string;
  weekEnd: string;
  reflection: WeeklyReflectionResult | null;
  userNote: WeeklyUserNote | null;
};

export const createEmptyThinkingDayRecord = (date: string, now = new Date().toISOString()): ThinkingDayRecord => ({
  date,
  memoCards: [],
  thinkingReflection: null,
  questionResponses: [],
  createdAt: now,
  updatedAt: now,
});

const normalizeString = (value: unknown) => (typeof value === 'string' ? value : '');

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()) : [];

export const normalizeThinkingMemoCard = (value: ThinkingMemoCard): ThinkingMemoCard => ({
  id: normalizeString(value.id),
  trigger: normalizeString(value.trigger).trim(),
  body: normalizeString(value.body).trim(),
  createdAt: normalizeString(value.createdAt) || new Date().toISOString(),
  updatedAt: normalizeString(value.updatedAt) || new Date().toISOString(),
});

export const normalizeThinkingReflectionCard = (value: ThinkingReflectionCard): ThinkingReflectionCard => ({
  card_id: normalizeString(value.card_id),
  trigger: normalizeString(value.trigger),
  thoughts: normalizeStringArray(value.thoughts),
  emotions: normalizeStringArray(value.emotions),
  body_reactions: normalizeStringArray(value.body_reactions),
  actions: normalizeStringArray(value.actions),
});

export const normalizeThinkingReflectionResult = (value: ThinkingReflectionResult): ThinkingReflectionResult => ({
  date: normalizeString(value.date),
  mode: thinkingReflectionMode,
  cards: Array.isArray(value.cards) ? value.cards.map(normalizeThinkingReflectionCard) : [],
  daily_patterns: normalizeStringArray(value.daily_patterns),
  insight_candidates: normalizeStringArray(value.insight_candidates),
  questions: normalizeStringArray(value.questions),
  importedAt: normalizeString(value.importedAt) || new Date().toISOString(),
  rawJson: normalizeString(value.rawJson),
});

export const normalizeThinkingQuestionResponse = (value: ThinkingQuestionResponse): ThinkingQuestionResponse => ({
  id: normalizeString(value.id),
  question: normalizeString(value.question).trim(),
  response: normalizeString(value.response).trim(),
  createdAt: normalizeString(value.createdAt) || new Date().toISOString(),
  updatedAt: normalizeString(value.updatedAt) || new Date().toISOString(),
});

export const normalizeWeeklyRepeatedPattern = (value: WeeklyRepeatedPattern): WeeklyRepeatedPattern => ({
  pattern: normalizeString(value.pattern).trim(),
  count: typeof value.count === 'number' && Number.isFinite(value.count) ? Math.max(1, Math.floor(value.count)) : 1,
});

export const normalizeWeeklyReflectionSourceDay = (value: WeeklyReflectionSourceDay): WeeklyReflectionSourceDay => ({
  date: normalizeString(value.date),
});

export const normalizeWeeklyReflectionResult = (value: WeeklyReflectionResult): WeeklyReflectionResult => ({
  week_start: normalizeString(value.week_start),
  week_end: normalizeString(value.week_end),
  mode: 'weekly_reflection',
  weekly_summary: normalizeString(value.weekly_summary),
  repeated_patterns: Array.isArray(value.repeated_patterns) ? value.repeated_patterns.map(normalizeWeeklyRepeatedPattern) : [],
  notable_changes: normalizeStringArray(value.notable_changes),
  question_answer_patterns: normalizeStringArray(value.question_answer_patterns),
  unanswered_question_patterns: normalizeStringArray(value.unanswered_question_patterns),
  carry_forward_questions: normalizeStringArray(value.carry_forward_questions),
  growing_insights: normalizeStringArray(value.growing_insights),
  source_days: Array.isArray(value.source_days) ? value.source_days.map(normalizeWeeklyReflectionSourceDay) : [],
  importedAt: normalizeString(value.importedAt) || new Date().toISOString(),
  rawJson: normalizeString(value.rawJson),
});

export const normalizeWeeklyUserNote = (value: WeeklyUserNote): WeeklyUserNote => ({
  week_start: normalizeString(value.week_start),
  week_end: normalizeString(value.week_end),
  note: normalizeString(value.note),
  updated_at: normalizeString(value.updated_at) || new Date().toISOString(),
});

export const normalizeThinkingWeekRecord = (value: ThinkingWeekRecord): ThinkingWeekRecord => ({
  weekStart: normalizeString(value.weekStart),
  weekEnd: normalizeString(value.weekEnd),
  reflection: value.reflection ? normalizeWeeklyReflectionResult(value.reflection) : null,
  userNote: value.userNote ? normalizeWeeklyUserNote(value.userNote) : null,
});

export const normalizeThinkingDayRecord = (value: ThinkingDayRecord): ThinkingDayRecord => ({
  date: normalizeString(value.date),
  memoCards: Array.isArray(value.memoCards) ? value.memoCards.map(normalizeThinkingMemoCard) : [],
  thinkingReflection: value.thinkingReflection ? normalizeThinkingReflectionResult(value.thinkingReflection) : null,
  questionResponses: Array.isArray(value.questionResponses) ? value.questionResponses.map(normalizeThinkingQuestionResponse) : [],
  createdAt: normalizeString(value.createdAt) || new Date().toISOString(),
  updatedAt: normalizeString(value.updatedAt) || new Date().toISOString(),
});

export const isThinkingReflectionMode = (value: unknown): value is ThinkingReflectionMode => value === thinkingReflectionMode;

export const isThinkingReflectionResult = (value: unknown): value is ThinkingReflectionResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ThinkingReflectionResult>;
  return (
    typeof candidate.date === 'string' &&
    isThinkingReflectionMode(candidate.mode) &&
    Array.isArray(candidate.cards) &&
    Array.isArray(candidate.daily_patterns) &&
    Array.isArray(candidate.insight_candidates) &&
    Array.isArray(candidate.questions)
  );
};

export const isWeeklyReflectionResult = (value: unknown): value is WeeklyReflectionResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<WeeklyReflectionResult>;
  return (
    typeof candidate.week_start === 'string' &&
    typeof candidate.week_end === 'string' &&
    candidate.mode === 'weekly_reflection' &&
    typeof candidate.weekly_summary === 'string' &&
    Array.isArray(candidate.repeated_patterns) &&
    Array.isArray(candidate.notable_changes) &&
    Array.isArray(candidate.question_answer_patterns) &&
    Array.isArray(candidate.unanswered_question_patterns) &&
    Array.isArray(candidate.growing_insights) &&
    Array.isArray(candidate.source_days)
  );
};

export const hasMeaningfulThinkingMemoContent = (value: CreateThinkingMemoCardInput | UpdateThinkingMemoCardInput) =>
  value.trigger.trim().length > 0 && value.body.trim().length > 0;

export const replaceThinkingDay = (days: ThinkingDayRecord[], day: ThinkingDayRecord) =>
  [...days.filter((item) => item.date !== day.date), day].sort((left, right) => left.date.localeCompare(right.date));

export const emptyThinkingSnapshot = () => ({
  ...createEmptyJournalSnapshot(),
  thinkingDays: [] as ThinkingDayRecord[],
});

export const createEmptyThinkingWeekRecord = (weekStart: string, weekEnd: string): ThinkingWeekRecord => ({
  weekStart,
  weekEnd,
  reflection: null,
  userNote: null,
});

export const aggregateThinkingWeek = (weekKey: string, days: ThinkingDayRecord[]): ThinkingWeekAggregate => {
  const patternMap = new Map<string, Set<string>>();
  const insightMap = new Map<string, Set<string>>();

  days.forEach((day) => {
    if (!day.thinkingReflection) {
      return;
    }

    day.thinkingReflection.daily_patterns.forEach((item) => {
      if (!patternMap.has(item)) {
        patternMap.set(item, new Set());
      }
      patternMap.get(item)!.add(day.date);
    });

    day.thinkingReflection.insight_candidates.forEach((item) => {
      if (!insightMap.has(item)) {
        insightMap.set(item, new Set());
      }
      insightMap.get(item)!.add(day.date);
    });
  });

  const toAggregateItems = (source: Map<string, Set<string>>): ThinkingWeekAggregateItem[] =>
    Array.from(source.entries())
      .map(([text, dates]) => ({
        text,
        dates: Array.from(dates).sort(),
        count: dates.size,
      }))
      .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text));

  return {
    weekKey,
    sourceDates: days.map((day) => day.date).sort(),
    patterns: toAggregateItems(patternMap),
    insights: toAggregateItems(insightMap),
  };
};
