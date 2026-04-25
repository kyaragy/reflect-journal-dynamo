import { create } from 'zustand';
import { format } from 'date-fns';
import {
  createEmptyThinkingDayRecord,
  replaceThinkingDay,
  type CreateThinkingMemoCardInput,
  type MonthlyReflectionResult,
  type MonthlyUserNote,
  type ThinkingDayRecord,
  type ThinkingMonthRecord,
  type ThinkingReflectionResult,
  type ThinkingWeekRecord,
  type UpdateThinkingMemoCardInput,
  type UpsertThinkingQuestionResponseInput,
  type WeeklyReflectionResult,
  type WeeklyUserNote,
} from '../domain/thinkingReflection';
import { addDays } from 'date-fns';
import { thinkingReflectionRepository } from '../repositories';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ThinkingReflectionState {
  days: ThinkingDayRecord[];
  weeks: ThinkingWeekRecord[];
  months: ThinkingMonthRecord[];
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  initializeMonth: (monthKey?: string) => Promise<void>;
  refreshDay: (date: string) => Promise<void>;
  refreshWeek: (weekStart: string) => Promise<void>;
  refreshMonthRecord: (monthKey: string) => Promise<void>;
  addMemoCard: (date: string, input: CreateThinkingMemoCardInput) => Promise<void>;
  updateMemoCard: (date: string, memoCardId: string, input: UpdateThinkingMemoCardInput) => Promise<void>;
  deleteMemoCard: (date: string, memoCardId: string) => Promise<void>;
  saveThinkingReflection: (date: string, reflection: ThinkingReflectionResult) => Promise<void>;
  saveQuestionResponses: (date: string, questionResponses: UpsertThinkingQuestionResponseInput[]) => Promise<void>;
  saveWeeklyReflection: (weekStart: string, reflection: WeeklyReflectionResult) => Promise<void>;
  saveWeeklyUserNote: (weekStart: string, userNote: WeeklyUserNote) => Promise<void>;
  saveMonthlyReflection: (monthKey: string, reflection: MonthlyReflectionResult) => Promise<void>;
  saveMonthlyUserNote: (monthKey: string, userNote: MonthlyUserNote) => Promise<void>;
}

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

const withLoading = async (
  set: (fn: (state: ThinkingReflectionState) => Partial<ThinkingReflectionState>) => void,
  work: () => Promise<void>
) => {
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

const withSaving = async (
  set: (fn: (state: ThinkingReflectionState) => Partial<ThinkingReflectionState>) => void,
  work: () => Promise<void>
) => {
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

const replaceMonth = (months: ThinkingMonthRecord[], month: ThinkingMonthRecord) =>
  [...months.filter((item) => item.monthKey !== month.monthKey), month].sort((left, right) => left.monthKey.localeCompare(right.monthKey));

export const useThinkingReflectionStore = create<ThinkingReflectionState>()((set, get) => ({
  days: [],
  weeks: [],
  months: [],
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
      const month = await thinkingReflectionRepository.getMonth(monthKey);
      set((state) => ({
        days: [
          ...state.days.filter((day) => !day.date.startsWith(monthKey)),
          ...month.days,
        ].sort((left, right) => left.date.localeCompare(right.date)),
        months: replaceMonth(state.months, month),
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
      const day = await thinkingReflectionRepository.getDay(date);
      set((state) => ({
        days: day ? replaceThinkingDay(state.days, day) : state.days.filter((item) => item.date !== date),
      }));
    });
  },

  async refreshWeek(weekStart) {
    await withLoading(set, async () => {
      const week = await thinkingReflectionRepository.getWeek(weekStart);
      set((state) => ({
        weeks: [...state.weeks.filter((item) => item.weekStart !== weekStart), week].sort((left, right) =>
          left.weekStart.localeCompare(right.weekStart)
        ),
      }));
    });
  },

  async refreshMonthRecord(monthKey) {
    await withLoading(set, async () => {
      const month = await thinkingReflectionRepository.getMonth(monthKey);
      set((state) => ({
        days: [
          ...state.days.filter((day) => !day.date.startsWith(monthKey)),
          ...month.days,
        ].sort((left, right) => left.date.localeCompare(right.date)),
        months: replaceMonth(state.months, month),
      }));
    });
  },

  async addMemoCard(date, input) {
    await withSaving(set, async () => {
      const day = await thinkingReflectionRepository.createMemoCard(date, input);
      set((state) => ({
        days: replaceThinkingDay(state.days, day),
      }));
    });
  },

  async updateMemoCard(date, memoCardId, input) {
    await withSaving(set, async () => {
      const day = await thinkingReflectionRepository.updateMemoCard(date, memoCardId, input);
      set((state) => ({
        days: replaceThinkingDay(state.days, day),
      }));
    });
  },

  async deleteMemoCard(date, memoCardId) {
    await withSaving(set, async () => {
      await thinkingReflectionRepository.deleteMemoCard(date, memoCardId);
      set((state) => {
        const current = state.days.find((item) => item.date === date);
        if (!current) {
          return {};
        }

        const now = new Date().toISOString();
        const nextDay =
          current.memoCards.length <= 1 && !current.thinkingReflection
            ? null
            : {
                ...current,
                memoCards: current.memoCards.filter((card) => card.id !== memoCardId),
                updatedAt: now,
              };

        return {
          days: nextDay ? replaceThinkingDay(state.days, nextDay) : state.days.filter((item) => item.date !== date),
        };
      });
    });
  },

  async saveThinkingReflection(date, reflection) {
    await withSaving(set, async () => {
      const day = await thinkingReflectionRepository.saveThinkingReflection(date, reflection);
      set((state) => ({
        days: replaceThinkingDay(state.days, day ?? createEmptyThinkingDayRecord(date)),
      }));
    });
  },

  async saveQuestionResponses(date, questionResponses) {
    await withSaving(set, async () => {
      const day = await thinkingReflectionRepository.saveQuestionResponses(date, questionResponses);
      set((state) => ({
        days: replaceThinkingDay(state.days, day ?? createEmptyThinkingDayRecord(date)),
      }));
    });
  },

  async saveWeeklyReflection(weekStart, reflection) {
    await withSaving(set, async () => {
      const week = await thinkingReflectionRepository.saveWeeklyReflection(weekStart, reflection);
      set((state) => ({
        weeks: [...state.weeks.filter((item) => item.weekStart !== weekStart), week].sort((left, right) =>
          left.weekStart.localeCompare(right.weekStart)
        ),
      }));
    });
  },

  async saveWeeklyUserNote(weekStart, userNote) {
    await withSaving(set, async () => {
      const week = await thinkingReflectionRepository.saveWeeklyUserNote(weekStart, userNote);
      set((state) => ({
        weeks: [...state.weeks.filter((item) => item.weekStart !== weekStart), week].sort((left, right) =>
          left.weekStart.localeCompare(right.weekStart)
        ),
      }));
    });
  },

  async saveMonthlyReflection(monthKey, reflection) {
    await withSaving(set, async () => {
      const month = await thinkingReflectionRepository.saveMonthlyReflection(monthKey, reflection);
      set((state) => ({
        days: [
          ...state.days.filter((day) => !day.date.startsWith(monthKey)),
          ...month.days,
        ].sort((left, right) => left.date.localeCompare(right.date)),
        months: replaceMonth(state.months, month),
      }));
    });
  },

  async saveMonthlyUserNote(monthKey, userNote) {
    await withSaving(set, async () => {
      const month = await thinkingReflectionRepository.saveMonthlyUserNote(monthKey, userNote);
      set((state) => ({
        days: [
          ...state.days.filter((day) => !day.date.startsWith(monthKey)),
          ...month.days,
        ].sort((left, right) => left.date.localeCompare(right.date)),
        months: replaceMonth(state.months, month),
      }));
    });
  },
}));
