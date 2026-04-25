import { assertDateString, assertMonthKey } from '../contracts/journalApi';
import {
  isMonthlyReflectionResult,
  normalizeMonthlyReflectionResult,
  type MonthlyReflectionResult,
  type ThinkingWeekRecord,
} from '../domain/thinkingReflection';
import { buildMonthlySourceWeeks, getMonthEnd, getMonthStart } from './monthlyReflectionPrompt';

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

export const parseMonthlyReflectionImport = (
  input: string,
  monthKey: string,
  sourceWeeks: ThinkingWeekRecord[]
): MonthlyReflectionResult => {
  assertMonthKey(monthKey);
  const monthStart = getMonthStart(monthKey);
  const monthEnd = getMonthEnd(monthKey);
  const jsonCandidate = extractJsonCandidate(input);
  const parsed = JSON.parse(jsonCandidate) as unknown;

  if (!isMonthlyReflectionResult(parsed)) {
    throw new Error('Imported JSON does not match the monthly reflection schema');
  }

  const reflection = normalizeMonthlyReflectionResult({
    ...parsed,
    importedAt: new Date().toISOString(),
    rawJson: jsonCandidate,
  });

  if (reflection.month_start !== monthStart) {
    throw new Error(`month_start must match ${monthStart}`);
  }

  if (reflection.month_end !== monthEnd) {
    throw new Error(`month_end must match ${monthEnd}`);
  }

  if (reflection.mode !== 'monthly_reflection') {
    throw new Error('mode must be "monthly_reflection"');
  }

  assertMaxItems(reflection.looping_patterns, 10, 'looping_patterns');
  assertMaxItems(reflection.evolving_insights, 10, 'evolving_insights');
  assertMaxItems(reflection.new_patterns, 10, 'new_patterns');
  assertMaxItems(reflection.resolved_or_reduced_patterns, 10, 'resolved_or_reduced_patterns');
  assertMaxItems(reflection.monthly_focus_points, 10, 'monthly_focus_points');

  const exportedWeeks = buildMonthlySourceWeeks(monthKey, sourceWeeks);
  const expectedWeekStarts = new Set(exportedWeeks.map((week) => week.week_start));
  const expectedWeekEnds = new Map(exportedWeeks.map((week) => [week.week_start, week.week_end]));
  if (reflection.source_weeks.length === 0) {
    throw new Error('source_weeks must contain at least one week');
  }

  reflection.source_weeks.forEach((week) => {
    assertDateString(week.week_start);
    assertDateString(week.week_end);

    if (!expectedWeekStarts.has(week.week_start)) {
      throw new Error(`Unexpected source week: ${week.week_start}`);
    }

    if (expectedWeekEnds.get(week.week_start) !== week.week_end) {
      throw new Error(`week_end must match exported value for ${week.week_start}`);
    }
  });

  return reflection;
};
