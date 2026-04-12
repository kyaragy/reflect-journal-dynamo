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

export const parseWeeklyReflectionImport = (
  input: string,
  weekStart: string,
  sourceDays: ThinkingDayRecord[]
): WeeklyReflectionResult => {
  assertDateString(weekStart);
  const weekEnd = getWeekEnd(weekStart);
  const jsonCandidate = extractJsonCandidate(input);
  const parsed = JSON.parse(jsonCandidate) as unknown;

  if (!isWeeklyReflectionResult(parsed)) {
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
