import { assertDateString } from '../contracts/journalApi';
import {
  isWeeklyReflectionResult,
  normalizeWeeklyReflectionResult,
  type ThinkingDayRecord,
  type WeeklyReflectionResult,
} from '../domain/thinkingReflection';
import { buildWeeklySourceDays, getWeekEnd } from './weeklyReflectionPrompt';

const extractJsonCandidate = (input: string) => {
  const trimmed = input.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ?? trimmed.match(/```\s*([\s\S]*?)\s*```/);
  return fenced ? fenced[1] : trimmed;
};

const assertMaxItems = (items: unknown[], max: number, label: string) => {
  if (items.length > max) {
    throw new Error(`${label} must contain at most ${max} items`);
  }
};

const ensureObject = (value: unknown, path: string) => {
  if (!value || typeof value !== 'object') {
    throw new Error(`schema mismatch: ${path} must be an object`);
  }
  return value as Record<string, unknown>;
};

const ensureArray = (value: unknown, path: string) => {
  if (!Array.isArray(value)) {
    throw new Error(`schema mismatch: ${path} must be an array`);
  }
  return value;
};

const ensureString = (value: unknown, path: string) => {
  if (typeof value !== 'string') {
    throw new Error(`schema mismatch: ${path} must be a string`);
  }
};

const validateWeeklySchema = (value: unknown) => {
  const obj = ensureObject(value, 'root');
  ensureString(obj.week_start, 'week_start');
  ensureString(obj.week_end, 'week_end');
  ensureString(obj.mode, 'mode');
  ensureString(obj.weekly_summary, 'weekly_summary');
  ensureArray(obj.repeated_patterns, 'repeated_patterns');
  ensureArray(obj.notable_changes, 'notable_changes');
  ensureArray(obj.question_answer_patterns, 'question_answer_patterns');
  ensureArray(obj.unanswered_question_patterns, 'unanswered_question_patterns');
  ensureArray(obj.growing_insights, 'growing_insights');
  const sourceDays = ensureArray(obj.source_days, 'source_days');
  sourceDays.forEach((item, index) => {
    const day = ensureObject(item, `source_days[${index}]`);
    ensureString(day.date, `source_days[${index}].date`);
  });
};

export const parseWeeklyReflectionImport = (
  input: string,
  weekStart: string,
  sourceDays: ThinkingDayRecord[]
): WeeklyReflectionResult => {
  assertDateString(weekStart);
  const weekEnd = getWeekEnd(weekStart);
  const jsonCandidate = extractJsonCandidate(input);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate) as unknown;
  } catch {
    throw new Error('JSON syntax error: 有効なJSON形式ではありません');
  }

  if (!isWeeklyReflectionResult(parsed)) {
    validateWeeklySchema(parsed);
    throw new Error('Imported JSON does not match the weekly reflection schema');
  }

  const reflection = normalizeWeeklyReflectionResult({
    ...parsed,
    importedAt: new Date().toISOString(),
    rawJson: jsonCandidate,
  });

  if (reflection.week_start !== weekStart) {
    throw new Error(`week_start must match ${weekStart}`);
  }

  if (reflection.week_end !== weekEnd) {
    throw new Error(`week_end must match ${weekEnd}`);
  }

  if (reflection.mode !== 'weekly_reflection') {
    throw new Error('mode must be "weekly_reflection"');
  }

  assertMaxItems(reflection.repeated_patterns, 10, 'repeated_patterns');
  assertMaxItems(reflection.notable_changes, 5, 'notable_changes');
  assertMaxItems(reflection.question_answer_patterns, 5, 'question_answer_patterns');
  assertMaxItems(reflection.unanswered_question_patterns, 5, 'unanswered_question_patterns');
  assertMaxItems(reflection.growing_insights, 5, 'growing_insights');

  const expectedDates = new Set(buildWeeklySourceDays(weekStart, sourceDays).map((day) => day.date));
  if (reflection.source_days.length === 0) {
    throw new Error('source_days must contain at least one day');
  }

  reflection.source_days.forEach((day) => {
    assertDateString(day.date);
    if (!expectedDates.has(day.date)) {
      throw new Error(`Unexpected source day: ${day.date}`);
    }
  });

  return reflection;
};
