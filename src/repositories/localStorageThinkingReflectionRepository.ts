import { v4 as uuidv4 } from 'uuid';
import type { ThinkingReflectionRepository } from './thinkingReflectionRepository';
import {
  createEmptyThinkingMonthRecord,
  createEmptyThinkingWeekRecord,
  createEmptyThinkingDayRecord,
  hasMeaningfulThinkingMemoContent,
  normalizeThinkingDayRecord,
  normalizeThinkingMonthRecord,
  normalizeThinkingWeekRecord,
  replaceThinkingDay,
  type CreateThinkingMemoCardInput,
  type MonthlyReflectionResult,
  type MonthlyUserNote,
  type ThinkingDayRecord,
  type ThinkingMonthRecord,
  type ThinkingWeekRecord,
  type ThinkingReflectionResult,
  type UpdateThinkingMemoCardInput,
  type UpsertThinkingQuestionResponseInput,
  type WeeklyReflectionResult,
  type WeeklyUserNote,
} from '../domain/thinkingReflection';
import { addDays, format, parseISO } from 'date-fns';

const STORAGE_KEY = 'reflect-journal-thinking-v2-storage';

type ThinkingSnapshot = {
  thinkingDays: ThinkingDayRecord[];
  thinkingWeeks: ThinkingWeekRecord[];
  thinkingMonths: ThinkingMonthRecord[];
};

const readSnapshot = (): ThinkingSnapshot => {
  if (typeof window === 'undefined') {
    return { thinkingDays: [], thinkingWeeks: [], thinkingMonths: [] };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { thinkingDays: [], thinkingWeeks: [], thinkingMonths: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const snapshot: Partial<ThinkingSnapshot> | undefined =
      parsed && typeof parsed === 'object' && 'state' in parsed
        ? (parsed as { state?: Partial<ThinkingSnapshot> }).state
        : (parsed as Partial<ThinkingSnapshot>);
    return {
      thinkingDays: Array.isArray(snapshot?.thinkingDays) ? snapshot.thinkingDays.map(normalizeThinkingDayRecord) : [],
      thinkingWeeks: Array.isArray(snapshot?.thinkingWeeks) ? snapshot.thinkingWeeks.map(normalizeThinkingWeekRecord) : [],
      thinkingMonths: Array.isArray(snapshot?.thinkingMonths) ? snapshot.thinkingMonths.map(normalizeThinkingMonthRecord) : [],
    };
  } catch {
    return { thinkingDays: [], thinkingWeeks: [], thinkingMonths: [] };
  }
};

const writeSnapshot = (snapshot: ThinkingSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: snapshot,
      version: 1,
    })
  );
};

const getDayRecord = (snapshot: ThinkingSnapshot, date: string) =>
  snapshot.thinkingDays.find((day) => day.date === date) ?? null;

const replaceWeek = (weeks: ThinkingWeekRecord[], week: ThinkingWeekRecord) =>
  [...weeks.filter((item) => item.weekStart !== week.weekStart), week].sort((left, right) => left.weekStart.localeCompare(right.weekStart));

const getWeekEnd = (weekStart: string) => format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');

const getWeekRecord = (snapshot: ThinkingSnapshot, weekStart: string) => snapshot.thinkingWeeks.find((week) => week.weekStart === weekStart) ?? null;
const getMonthRecord = (snapshot: ThinkingSnapshot, monthKey: string) => snapshot.thinkingMonths.find((month) => month.monthKey === monthKey) ?? null;

const replaceMonth = (months: ThinkingMonthRecord[], month: ThinkingMonthRecord) =>
  [...months.filter((item) => item.monthKey !== month.monthKey), month].sort((left, right) => left.monthKey.localeCompare(right.monthKey));

const persistDay = (snapshot: ThinkingSnapshot, day: ThinkingDayRecord) => {
  const nextSnapshot = {
    thinkingDays: replaceThinkingDay(snapshot.thinkingDays, day),
    thinkingWeeks: snapshot.thinkingWeeks,
    thinkingMonths: snapshot.thinkingMonths,
  };

  writeSnapshot(nextSnapshot);
  return normalizeThinkingDayRecord(day);
};

const persistWeek = (snapshot: ThinkingSnapshot, week: ThinkingWeekRecord) => {
  const nextSnapshot = {
    thinkingDays: snapshot.thinkingDays,
    thinkingWeeks: replaceWeek(snapshot.thinkingWeeks, week),
    thinkingMonths: snapshot.thinkingMonths,
  };

  writeSnapshot(nextSnapshot);
  return normalizeThinkingWeekRecord(week);
};

const persistMonth = (snapshot: ThinkingSnapshot, month: ThinkingMonthRecord) => {
  const nextSnapshot = {
    thinkingDays: snapshot.thinkingDays,
    thinkingWeeks: snapshot.thinkingWeeks,
    thinkingMonths: replaceMonth(snapshot.thinkingMonths, month),
  };

  writeSnapshot(nextSnapshot);
  return normalizeThinkingMonthRecord(month);
};

export const localStorageThinkingReflectionRepository: ThinkingReflectionRepository = {
  async getDay(date) {
    const snapshot = readSnapshot();
    const day = getDayRecord(snapshot, date);
    return day ? normalizeThinkingDayRecord(day) : null;
  },

  async getMonth(monthKey) {
    const snapshot = readSnapshot();
    const month = getMonthRecord(snapshot, monthKey) ?? createEmptyThinkingMonthRecord(monthKey);
    return {
      monthKey,
      days: snapshot.thinkingDays.filter((day) => day.date.startsWith(monthKey)).map(normalizeThinkingDayRecord),
      reflection: month.reflection,
      userNote: month.userNote,
    } satisfies ThinkingMonthRecord;
  },

  async getWeek(weekStart) {
    const snapshot = readSnapshot();
    return getWeekRecord(snapshot, weekStart) ?? createEmptyThinkingWeekRecord(weekStart, getWeekEnd(weekStart));
  },

  async createMemoCard(date, input) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw new Error('Memo card must include both trigger and body');
    }

    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const current = getDayRecord(snapshot, date) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: [
        ...current.memoCards,
        {
          id: uuidv4(),
          trigger: input.trigger.trim(),
          body: input.body.trim(),
          createdAt: now,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };

    return persistDay(snapshot, nextDay);
  },

  async updateMemoCard(date, memoCardId, input) {
    if (!hasMeaningfulThinkingMemoContent(input)) {
      throw new Error('Memo card must include both trigger and body');
    }

    const snapshot = readSnapshot();
    const current = getDayRecord(snapshot, date);
    if (!current?.memoCards.some((card) => card.id === memoCardId)) {
      throw new Error('Thinking memo card not found');
    }

    const now = new Date().toISOString();
    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: current.memoCards.map((card) =>
        card.id === memoCardId
          ? {
              ...card,
              trigger: input.trigger.trim(),
              body: input.body.trim(),
              updatedAt: now,
            }
          : card
      ),
      updatedAt: now,
    };

    return persistDay(snapshot, nextDay);
  },

  async deleteMemoCard(date, memoCardId) {
    const snapshot = readSnapshot();
    const current = getDayRecord(snapshot, date);
    if (!current) {
      return;
    }

    const nextDay: ThinkingDayRecord = {
      ...current,
      memoCards: current.memoCards.filter((card) => card.id !== memoCardId),
      updatedAt: new Date().toISOString(),
    };

    persistDay(snapshot, nextDay);
  },

  async saveThinkingReflection(date, reflection) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const current = getDayRecord(snapshot, date) ?? createEmptyThinkingDayRecord(date, now);
    const nextDay: ThinkingDayRecord = {
      ...current,
      thinkingReflection: {
        ...reflection,
        importedAt: reflection.importedAt || now,
      },
      updatedAt: now,
    };

    return persistDay(snapshot, nextDay);
  },

  async saveQuestionResponses(date, questionResponses) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const current = getDayRecord(snapshot, date) ?? createEmptyThinkingDayRecord(date, now);
    const previousByQuestion = new Map(current.questionResponses.map((item) => [item.question, item]));
    const nextDay: ThinkingDayRecord = {
      ...current,
      questionResponses: questionResponses
        .filter((item) => item.question.trim().length > 0)
        .map((item) => {
          const existing = previousByQuestion.get(item.question);
          return {
            id: existing?.id ?? uuidv4(),
            question: item.question.trim(),
            response: item.response.trim(),
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
        }),
      updatedAt: now,
    };

    return persistDay(snapshot, nextDay);
  },

  async saveWeeklyReflection(weekStart, reflection) {
    const snapshot = readSnapshot();
    const current = getWeekRecord(snapshot, weekStart) ?? createEmptyThinkingWeekRecord(weekStart, getWeekEnd(weekStart));
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      reflection: {
        ...reflection,
        importedAt: reflection.importedAt || new Date().toISOString(),
      },
    };

    return persistWeek(snapshot, nextWeek);
  },

  async saveWeeklyUserNote(weekStart, userNote) {
    const snapshot = readSnapshot();
    const current = getWeekRecord(snapshot, weekStart) ?? createEmptyThinkingWeekRecord(weekStart, getWeekEnd(weekStart));
    const nextWeek: ThinkingWeekRecord = {
      ...current,
      userNote: userNote as WeeklyUserNote,
    };

    return persistWeek(snapshot, nextWeek);
  },

  async saveMonthlyReflection(monthKey, reflection) {
    const snapshot = readSnapshot();
    const current = getMonthRecord(snapshot, monthKey) ?? createEmptyThinkingMonthRecord(monthKey);
    const nextMonth: ThinkingMonthRecord = {
      ...current,
      monthKey,
      days: snapshot.thinkingDays.filter((day) => day.date.startsWith(monthKey)).map(normalizeThinkingDayRecord),
      reflection: {
        ...reflection,
        importedAt: reflection.importedAt || new Date().toISOString(),
      } as MonthlyReflectionResult,
    };

    return persistMonth(snapshot, nextMonth);
  },

  async saveMonthlyUserNote(monthKey, userNote) {
    const snapshot = readSnapshot();
    const current = getMonthRecord(snapshot, monthKey) ?? createEmptyThinkingMonthRecord(monthKey);
    const nextMonth: ThinkingMonthRecord = {
      ...current,
      monthKey,
      days: snapshot.thinkingDays.filter((day) => day.date.startsWith(monthKey)).map(normalizeThinkingDayRecord),
      userNote: userNote as MonthlyUserNote,
    };

    return persistMonth(snapshot, nextMonth);
  },
};
