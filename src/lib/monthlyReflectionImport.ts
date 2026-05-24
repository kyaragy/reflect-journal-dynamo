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

const validateMonthlySchema = (value: unknown) => {
  const root = ensureObject(value, 'root');
  const reflection = ensureObject(root.reflection, 'reflection');
  ensureString(reflection.month_start, 'reflection.month_start');
  ensureString(reflection.month_end, 'reflection.month_end');
  ensureString(reflection.mode, 'reflection.mode');
  ensureString(reflection.monthly_summary, 'reflection.monthly_summary');
  ensureArray(reflection.looping_patterns, 'reflection.looping_patterns');
  ensureArray(reflection.evolving_insights, 'reflection.evolving_insights');
  ensureArray(reflection.new_patterns, 'reflection.new_patterns');
  ensureArray(reflection.resolved_or_reduced_patterns, 'reflection.resolved_or_reduced_patterns');
  ensureArray(reflection.monthly_focus_points, 'reflection.monthly_focus_points');
  const sourceWeeks = ensureArray(reflection.source_weeks, 'reflection.source_weeks');
  sourceWeeks.forEach((item, index) => {
    const week = ensureObject(item, `reflection.source_weeks[${index}]`);
    ensureString(week.week_start, `reflection.source_weeks[${index}].week_start`);
    ensureString(week.week_end, `reflection.source_weeks[${index}].week_end`);
  });
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate) as unknown;
  } catch {
    throw new Error('JSON syntax error: 有効なJSON形式ではありません');
  }
  const reflectionCandidate = parsed && typeof parsed === 'object' ? (parsed as { reflection?: unknown }).reflection : undefined;

  if (!reflectionCandidate) {
    throw new Error('Imported JSON must include top-level "reflection"');
  }

  if (!isMonthlyReflectionResult(reflectionCandidate)) {
    validateMonthlySchema(parsed);
    throw new Error('Imported JSON does not match the monthly reflection schema');
  }

  const reflection = normalizeMonthlyReflectionResult({
    ...reflectionCandidate,
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
