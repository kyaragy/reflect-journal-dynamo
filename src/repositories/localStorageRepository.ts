import { v4 as uuidv4 } from 'uuid';
import { addDays, format, parseISO } from 'date-fns';
import type {
  CreateJournalCardInput,
  DayRecord,
  JournalEntry,
  JournalSnapshot,
} from '../domain/journal';
import type { JournalRepository } from './journalRepository';

const STORAGE_KEY = 'journal-storage';

const createEmptySnapshot = (): JournalSnapshot => ({
  entries: [],
  summaries: {},
  weeklyReflections: {},
  monthlyReflections: {},
  yearlyReflections: {},
});

const isSnapshot = (value: unknown): value is JournalSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<JournalSnapshot>;
  return (
    Array.isArray(candidate.entries) &&
    typeof candidate.summaries === 'object' &&
    candidate.summaries !== null &&
    typeof candidate.weeklyReflections === 'object' &&
    candidate.weeklyReflections !== null &&
    typeof candidate.monthlyReflections === 'object' &&
    candidate.monthlyReflections !== null &&
    typeof candidate.yearlyReflections === 'object' &&
    candidate.yearlyReflections !== null
  );
};

const readSnapshot = (): JournalSnapshot => {
  if (typeof window === 'undefined') {
    return createEmptySnapshot();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptySnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isSnapshot(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'state' in parsed &&
      isSnapshot((parsed as { state: unknown }).state)
    ) {
      return (parsed as { state: JournalSnapshot }).state;
    }
  } catch {
    return createEmptySnapshot();
  }

  return createEmptySnapshot();
};

const writeSnapshot = (snapshot: JournalSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      state: snapshot,
      version: 0,
    })
  );
};

const getDayRecord = (snapshot: JournalSnapshot, date: string): DayRecord => ({
  date,
  entries: snapshot.entries.filter((entry) => entry.date === date),
  summary: snapshot.summaries[date],
});

export const localStorageRepository: JournalRepository = {
  getState() {
    return readSnapshot();
  },

  getDay(date) {
    return getDayRecord(readSnapshot(), date);
  },

  saveDay(day) {
    const snapshot = readSnapshot();
    const nextEntries = snapshot.entries.filter((entry) => entry.date !== day.date);
    const nextSnapshot: JournalSnapshot = {
      ...snapshot,
      entries: [...nextEntries, ...day.entries],
      summaries: day.summary
        ? { ...snapshot.summaries, [day.date]: day.summary }
        : Object.fromEntries(Object.entries(snapshot.summaries).filter(([key]) => key !== day.date)),
    };
    writeSnapshot(nextSnapshot);
  },

  getWeek(weekKey) {
    const snapshot = readSnapshot();
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayKey = format(addDays(parseISO(weekKey), index), 'yyyy-MM-dd');
      return getDayRecord(snapshot, dayKey);
    });

    return {
      weekKey,
      reflection: snapshot.weeklyReflections[weekKey] ?? '',
      days,
    };
  },

  saveWeekSummary(weekKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      weeklyReflections: {
        ...snapshot.weeklyReflections,
        [weekKey]: summary,
      },
    });
  },

  getMonth(monthKey) {
    const snapshot = readSnapshot();
    const dayKeys = Object.keys(snapshot.summaries)
      .concat(snapshot.entries.map((entry) => entry.date))
      .filter((date, index, dates) => date.startsWith(monthKey) && dates.indexOf(date) === index)
      .sort();

    const weekSummaries = Object.fromEntries(
      Object.entries(snapshot.weeklyReflections).filter(([weekKey]) => weekKey.startsWith(monthKey))
    );

    return {
      monthKey,
      reflection: snapshot.monthlyReflections[monthKey] ?? '',
      weekSummaries,
      days: dayKeys.map((date) => getDayRecord(snapshot, date)),
    };
  },

  saveMonthSummary(monthKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      monthlyReflections: {
        ...snapshot.monthlyReflections,
        [monthKey]: summary,
      },
    });
  },

  getYear(yearKey) {
    const snapshot = readSnapshot();
    const monthSummaries = Object.fromEntries(
      Object.entries(snapshot.monthlyReflections).filter(([monthKey]) => monthKey.startsWith(yearKey))
    );

    return {
      yearKey,
      reflection: snapshot.yearlyReflections[yearKey] ?? '',
      monthSummaries,
    };
  },

  saveYearSummary(yearKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      yearlyReflections: {
        ...snapshot.yearlyReflections,
        [yearKey]: summary,
      },
    });
  },

  createCard(date, card) {
    const snapshot = readSnapshot();
    const entry: JournalEntry = {
      ...card,
      date,
      id: uuidv4(),
      createdAt: Date.now(),
    };

    writeSnapshot({
      ...snapshot,
      entries: [...snapshot.entries, entry],
    });

    return entry;
  },

  updateCard(_date, cardId, card) {
    const snapshot = readSnapshot();
    let updatedEntry: JournalEntry | null = null;

    const entries = snapshot.entries.map((entry) => {
      if (entry.id !== cardId) {
        return entry;
      }

      updatedEntry = {
        ...entry,
        ...card,
        id: entry.id,
        createdAt: entry.createdAt,
      };

      return updatedEntry;
    });

    writeSnapshot({
      ...snapshot,
      entries,
    });

    return updatedEntry;
  },

  deleteCard(_date, cardId) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      entries: snapshot.entries.filter((entry) => entry.id !== cardId),
    });
  },

  saveDailySummary(date, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      summaries: {
        ...snapshot.summaries,
        [date]: summary,
      },
    });
  },
};
