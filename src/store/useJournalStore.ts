import { create } from 'zustand';
import { format } from 'date-fns';
import type {
  Card,
  CreateCardInput,
  Day,
  MonthlySummary,
  WeeklySummary,
  YearlySummary,
} from '../domain/journal';
import { journalRepository } from '../repositories';

export type { Card, Day, MonthlySummary, WeeklySummary, YearlySummary } from '../domain/journal';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface JournalState {
  days: Day[];
  weeklySummaries: WeeklySummary[];
  monthlySummaries: MonthlySummary[];
  yearlySummaries: YearlySummary[];
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  initializeMonth: (monthKey?: string) => Promise<void>;
  refreshDay: (date: string) => Promise<void>;
  refreshWeek: (weekKey: string) => Promise<void>;
  refreshMonth: (monthKey: string) => Promise<void>;
  refreshYear: (yearKey: string) => Promise<void>;
  addEntry: (entry: CreateCardInput & { date: string }) => Promise<void>;
  updateEntry: (date: string, id: string, entry: Partial<Card>) => Promise<void>;
  deleteEntry: (date: string, id: string) => Promise<void>;
  setSummary: (date: string, summary: string) => Promise<void>;
  setWeeklyReflection: (weekKey: string, reflection: string) => Promise<void>;
  setMonthlyReflection: (monthKey: string, reflection: string) => Promise<void>;
  setYearlyReflection: (yearKey: string, reflection: string) => Promise<void>;
}

const emptyState = {
  days: [],
  weeklySummaries: [],
  monthlySummaries: [],
  yearlySummaries: [],
};

const replaceDay = (days: Day[], day: Day) =>
  [...days.filter((item) => item.date !== day.date), day].sort((left, right) => left.date.localeCompare(right.date));

const mergeWeek = (state: JournalState, week: { weekKey: string; days: Day[]; summary?: WeeklySummary }) => ({
  days: [...state.days.filter((day) => !week.days.some((weekDay) => weekDay.date === day.date)), ...week.days].sort((left, right) =>
    left.date.localeCompare(right.date)
  ),
  weeklySummaries: week.summary
    ? [...state.weeklySummaries.filter((item) => item.weekKey !== week.weekKey), week.summary].sort((left, right) =>
        left.weekKey.localeCompare(right.weekKey)
      )
    : state.weeklySummaries.filter((item) => item.weekKey !== week.weekKey),
});

const mergeMonth = (state: JournalState, month: { monthKey: string; days: Day[]; summary?: MonthlySummary; weeklySummaries: WeeklySummary[] }) => {
  const weekKeys = new Set(month.weeklySummaries.map((item) => item.weekKey));
  return {
    days: [...state.days.filter((day) => !day.date.startsWith(month.monthKey)), ...month.days].sort((left, right) =>
      left.date.localeCompare(right.date)
    ),
    weeklySummaries: [
      ...state.weeklySummaries.filter((item) => !weekKeys.has(item.weekKey)),
      ...month.weeklySummaries,
    ].sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
    monthlySummaries: month.summary
      ? [...state.monthlySummaries.filter((item) => item.monthKey !== month.monthKey), month.summary].sort((left, right) =>
          left.monthKey.localeCompare(right.monthKey)
        )
      : state.monthlySummaries.filter((item) => item.monthKey !== month.monthKey),
  };
};

const mergeYear = (state: JournalState, year: { yearKey: string; summary?: YearlySummary; monthlySummaries: MonthlySummary[] }) => ({
  monthlySummaries: [
    ...state.monthlySummaries.filter((item) => !item.monthKey.startsWith(year.yearKey)),
    ...year.monthlySummaries,
  ].sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
  yearlySummaries: year.summary
    ? [...state.yearlySummaries.filter((item) => item.yearKey !== year.yearKey), year.summary].sort((left, right) =>
        left.yearKey.localeCompare(right.yearKey)
      )
    : state.yearlySummaries.filter((item) => item.yearKey !== year.yearKey),
});

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

const withLoading = async (set: (fn: (state: JournalState) => Partial<JournalState>) => void, work: () => Promise<void>) => {
  set(() => ({ loading: true, error: null }));

  try {
    await work();
    set(() => ({ loading: false }));
  } catch (error) {
    set(() => ({
      loading: false,
      error: toErrorMessage(error),
      initialLoadStatus: 'error',
    }));
    throw error;
  }
};

const withSaving = async (set: (fn: (state: JournalState) => Partial<JournalState>) => void, work: () => Promise<void>) => {
  set(() => ({ saving: true, error: null }));

  try {
    await work();
    set(() => ({ saving: false }));
  } catch (error) {
    set(() => ({
      saving: false,
      error: toErrorMessage(error),
      initialLoadStatus: 'error',
    }));
    throw error;
  }
};

export const useJournalStore = create<JournalState>()((set, get) => ({
  ...emptyState,
  loading: false,
  saving: false,
  initialLoadStatus: 'idle',
  error: null,

  async initializeMonth(monthKey = format(new Date(), 'yyyy-MM')) {
    if (get().initialLoadStatus === 'loading') {
      return;
    }

    set(() => ({
      loading: true,
      error: null,
      initialLoadStatus: 'loading',
    }));

    try {
      const month = await journalRepository.getMonth(monthKey);
      set(() => ({
        ...mergeMonth(
          {
            ...get(),
            loading: false,
            saving: false,
            error: null,
            initialLoadStatus: 'loading',
          },
          month
        ),
        loading: false,
        initialLoadStatus: 'ready',
        error: null,
      }));
    } catch (error) {
      set(() => ({
        loading: false,
        initialLoadStatus: 'error',
        error: toErrorMessage(error),
      }));
    }
  },

  async refreshDay(date) {
    await withLoading(set, async () => {
      const day = await journalRepository.getDay(date);
      if (!day) {
        set((state) => ({
          days: state.days.filter((item) => item.date !== date),
        }));
        return;
      }

      set((state) => ({
        days: replaceDay(state.days, day),
      }));
    });
  },

  async refreshWeek(weekKey) {
    await withLoading(set, async () => {
      const week = await journalRepository.getWeek(weekKey);
      set((state) => ({
        ...mergeWeek(state, week),
      }));
    });
  },

  async refreshMonth(monthKey) {
    await withLoading(set, async () => {
      const month = await journalRepository.getMonth(monthKey);
      set((state) => ({
        ...mergeMonth(state, month),
      }));
    });
  },

  async refreshYear(yearKey) {
    await withLoading(set, async () => {
      const year = await journalRepository.getYear(yearKey);
      set((state) => ({
        ...mergeYear(state, year),
      }));
    });
  },

  async addEntry(entry) {
    await withSaving(set, async () => {
      const createdCard = await journalRepository.createCard(entry.date, entry);
      set((state) => {
        const currentDay = state.days.find((day) => day.date === entry.date);
        const nextDay = currentDay
          ? {
              ...currentDay,
              cards: [...currentDay.cards, createdCard],
              updatedAt: createdCard.updatedAt,
            }
          : {
              date: entry.date,
              cards: [createdCard],
              dailySummary: '',
              createdAt: createdCard.createdAt,
              updatedAt: createdCard.updatedAt,
            };

        return {
          days: replaceDay(state.days, nextDay),
        };
      });
    });
  },

  async updateEntry(date, id, updatedEntry) {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    await withSaving(set, async () => {
      const updatedCard = await journalRepository.updateCard(date, id, updatedEntry);
      if (!updatedCard) {
        return;
      }

      set((state) => ({
        days: state.days.map((day) =>
          day.date === date
            ? {
                ...day,
                updatedAt: updatedCard.updatedAt,
                cards: day.cards.map((card) => (card.id === id ? updatedCard : card)),
              }
            : day
        ),
      }));
    });
  },

  async deleteEntry(date, id) {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    await withSaving(set, async () => {
      await journalRepository.deleteCard(date, id);
      const now = new Date().toISOString();
      set((state) => ({
        days: state.days.map((day) =>
          day.date === date
            ? {
                ...day,
                updatedAt: now,
                cards: day.cards.filter((card) => card.id !== id),
              }
            : day
        ),
      }));
    });
  },

  async setSummary(date, summary) {
    await withSaving(set, async () => {
      const day = await journalRepository.saveDailySummary(date, summary);
      set((state) => ({
        days: replaceDay(state.days, day),
      }));
    });
  },

  async setWeeklyReflection(weekKey, reflection) {
    await withSaving(set, async () => {
      const week = await journalRepository.saveWeekSummary(weekKey, reflection);
      set((state) => ({
        ...mergeWeek(state, week),
      }));
    });
  },

  async setMonthlyReflection(monthKey, reflection) {
    await withSaving(set, async () => {
      const month = await journalRepository.saveMonthSummary(monthKey, reflection);
      set((state) => ({
        ...mergeMonth(state, month),
      }));
    });
  },

  async setYearlyReflection(yearKey, reflection) {
    await withSaving(set, async () => {
      const year = await journalRepository.saveYearSummary(yearKey, reflection);
      set((state) => ({
        ...mergeYear(state, year),
      }));
    });
  },
}));
