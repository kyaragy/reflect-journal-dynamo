import { v4 as uuidv4 } from 'uuid';
import { addDays, format, parseISO } from 'date-fns';
import type {
  CreateCardInput,
  Card,
  Day,
  JournalSnapshot,
  MonthlySummary,
  WeeklySummary,
  YearlySummary,
} from '../domain/journal';
import type { JournalRepository } from './journalRepository';

const STORAGE_KEY = 'journal-storage';

const createEmptySnapshot = (): JournalSnapshot => ({
  days: [],
  weeklySummaries: [],
  monthlySummaries: [],
  yearlySummaries: [],
});

const isSnapshot = (value: unknown): value is JournalSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<JournalSnapshot>;
  return (
    Array.isArray(candidate.days) &&
    Array.isArray(candidate.weeklySummaries) &&
    Array.isArray(candidate.monthlySummaries) &&
    Array.isArray(candidate.yearlySummaries)
  );
};

type LegacyEntry = {
  id: string;
  date: string;
  fact: string;
  thought: string;
  emotion: string;
  sensation: string;
  createdAt: number;
};

type LegacySummary = {
  date: string;
  summary: string;
  reflection: string;
};

type LegacySnapshot = {
  entries: LegacyEntry[];
  summaries: Record<string, LegacySummary>;
  weeklyReflections: Record<string, string>;
  monthlyReflections: Record<string, string>;
  yearlyReflections: Record<string, string>;
};

const getTimestamp = (value: number | string | undefined, fallback: string) => {
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return value || fallback;
};

const toDayMap = (snapshot: LegacySnapshot) => {
  const dayMap = new Map<string, Day>();

  for (const entry of snapshot.entries) {
    const cardCreatedAt = getTimestamp(entry.createdAt, new Date().toISOString());
    const card: Card = {
      id: entry.id,
      fact: entry.fact,
      thought: entry.thought,
      emotion: entry.emotion,
      bodySensation: entry.sensation,
      createdAt: cardCreatedAt,
      updatedAt: cardCreatedAt,
    };

    const existing = dayMap.get(entry.date);
    if (existing) {
      existing.cards.push(card);
      existing.updatedAt = card.updatedAt;
      continue;
    }

    dayMap.set(entry.date, {
      date: entry.date,
      cards: [card],
      dailySummary: snapshot.summaries[entry.date]?.reflection ?? '',
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    });
  }

  for (const [date, summary] of Object.entries(snapshot.summaries)) {
    const existing = dayMap.get(date);
    if (existing) {
      existing.dailySummary = summary.reflection;
      existing.updatedAt = new Date().toISOString();
      continue;
    }

    const now = new Date().toISOString();
    dayMap.set(date, {
      date,
      cards: [],
      dailySummary: summary.reflection,
      createdAt: now,
      updatedAt: now,
    });
  }

  return dayMap;
};

const migrateLegacySnapshot = (snapshot: LegacySnapshot): JournalSnapshot => {
  const now = new Date().toISOString();
  return {
    days: Array.from(toDayMap(snapshot).values()).sort((left, right) => left.date.localeCompare(right.date)),
    weeklySummaries: Object.entries(snapshot.weeklyReflections).map(([weekKey, summary]) => ({
      weekKey,
      summary,
      createdAt: now,
      updatedAt: now,
    })),
    monthlySummaries: Object.entries(snapshot.monthlyReflections).map(([monthKey, summary]) => ({
      monthKey,
      summary,
      createdAt: now,
      updatedAt: now,
    })),
    yearlySummaries: Object.entries(snapshot.yearlyReflections).map(([yearKey, summary]) => ({
      yearKey,
      summary,
      createdAt: now,
      updatedAt: now,
    })),
  };
};

const isLegacySnapshot = (value: unknown): value is LegacySnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LegacySnapshot>;
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

    if (isLegacySnapshot(parsed)) {
      return migrateLegacySnapshot(parsed);
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'state' in parsed
    ) {
      const state = (parsed as { state: unknown }).state;
      if (isSnapshot(state)) {
        return state;
      }
      if (isLegacySnapshot(state)) {
        return migrateLegacySnapshot(state);
      }
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

const getDay = (snapshot: JournalSnapshot, date: string) =>
  snapshot.days.find((day) => day.date === date) ?? null;

const upsertWeeklySummary = (
  summaries: WeeklySummary[],
  weekKey: string,
  summary: string
) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.weekKey === weekKey);
  if (!existing) {
    return [...summaries, { weekKey, summary, createdAt: now, updatedAt: now }];
  }
  return summaries.map((item) =>
    item.weekKey === weekKey ? { ...item, summary, updatedAt: now } : item
  );
};

const upsertMonthlySummary = (
  summaries: MonthlySummary[],
  monthKey: string,
  summary: string
) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.monthKey === monthKey);
  if (!existing) {
    return [...summaries, { monthKey, summary, createdAt: now, updatedAt: now }];
  }
  return summaries.map((item) =>
    item.monthKey === monthKey ? { ...item, summary, updatedAt: now } : item
  );
};

const upsertYearlySummary = (
  summaries: YearlySummary[],
  yearKey: string,
  summary: string
) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.yearKey === yearKey);
  if (!existing) {
    return [...summaries, { yearKey, summary, createdAt: now, updatedAt: now }];
  }
  return summaries.map((item) =>
    item.yearKey === yearKey ? { ...item, summary, updatedAt: now } : item
  );
};

export const localStorageRepository: JournalRepository = {
  getState() {
    return readSnapshot();
  },

  getDay(date) {
    return getDay(readSnapshot(), date);
  },

  saveDay(day) {
    const snapshot = readSnapshot();
    const days = snapshot.days.filter((item) => item.date !== day.date);
    writeSnapshot({
      ...snapshot,
      days: [...days, day].sort((left, right) => left.date.localeCompare(right.date)),
    });
  },

  getWeek(weekKey) {
    const snapshot = readSnapshot();
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayKey = format(addDays(parseISO(weekKey), index), 'yyyy-MM-dd');
      return getDay(snapshot, dayKey);
    }).filter((day): day is Day => Boolean(day));

    return {
      weekKey,
      summary: snapshot.weeklySummaries.find((item) => item.weekKey === weekKey),
      days,
    };
  },

  saveWeekSummary(weekKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      weeklySummaries: upsertWeeklySummary(snapshot.weeklySummaries, weekKey, summary),
    });
  },

  getMonth(monthKey) {
    const snapshot = readSnapshot();
    const days = snapshot.days.filter((day) => day.date.startsWith(monthKey));

    return {
      monthKey,
      summary: snapshot.monthlySummaries.find((item) => item.monthKey === monthKey),
      weeklySummaries: snapshot.weeklySummaries.filter((item) => item.weekKey.startsWith(monthKey)),
      days,
    };
  },

  saveMonthSummary(monthKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      monthlySummaries: upsertMonthlySummary(snapshot.monthlySummaries, monthKey, summary),
    });
  },

  getYear(yearKey) {
    const snapshot = readSnapshot();

    return {
      yearKey,
      summary: snapshot.yearlySummaries.find((item) => item.yearKey === yearKey),
      monthlySummaries: snapshot.monthlySummaries.filter((item) => item.monthKey.startsWith(yearKey)),
    };
  },

  saveYearSummary(yearKey, summary) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      yearlySummaries: upsertYearlySummary(snapshot.yearlySummaries, yearKey, summary),
    });
  },

  createCard(date, card: CreateCardInput) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const nextCard: Card = {
      ...card,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    const currentDay = getDay(snapshot, date);

    if (!currentDay) {
      const nextDay: Day = {
        date,
        cards: [nextCard],
        dailySummary: '',
        createdAt: now,
        updatedAt: now,
      };
      writeSnapshot({
        ...snapshot,
        days: [...snapshot.days, nextDay].sort((left, right) => left.date.localeCompare(right.date)),
      });
      return nextCard;
    }

    writeSnapshot({
      ...snapshot,
      days: snapshot.days.map((day) =>
        day.date === date
          ? {
              ...day,
              cards: [...day.cards, nextCard],
              updatedAt: now,
            }
          : day
      ),
    });

    return nextCard;
  },

  updateCard(date, cardId, card) {
    const snapshot = readSnapshot();
    let updatedCard: Card | null = null;
    const now = new Date().toISOString();

    writeSnapshot({
      ...snapshot,
      days: snapshot.days.map((day) => {
        if (day.date !== date) {
          return day;
        }

        return {
          ...day,
          updatedAt: now,
          cards: day.cards.map((currentCard) => {
            if (currentCard.id !== cardId) {
              return currentCard;
            }

            updatedCard = {
              ...currentCard,
              ...card,
              id: currentCard.id,
              createdAt: currentCard.createdAt,
              updatedAt: now,
            };

            return updatedCard;
          }),
        };
      }),
    });

    return updatedCard;
  },

  deleteCard(date, cardId) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    writeSnapshot({
      ...snapshot,
      days: snapshot.days.map((day) =>
        day.date === date
          ? {
              ...day,
              cards: day.cards.filter((card) => card.id !== cardId),
              updatedAt: now,
            }
          : day
      ),
    });
  },

  saveDailySummary(date, summary) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const currentDay = getDay(snapshot, date);

    if (!currentDay) {
      writeSnapshot({
        ...snapshot,
        days: [
          ...snapshot.days,
          {
            date,
            cards: [],
            dailySummary: summary,
            createdAt: now,
            updatedAt: now,
          },
        ].sort((left, right) => left.date.localeCompare(right.date)),
      });
      return;
    }

    writeSnapshot({
      ...snapshot,
      days: snapshot.days.map((day) =>
        day.date === date
          ? {
              ...day,
              dailySummary: summary,
              updatedAt: now,
            }
          : day
      ),
    });
  },
};
