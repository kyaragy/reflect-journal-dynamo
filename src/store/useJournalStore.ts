import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type JournalEntry = {
  id: string;
  date: string; // YYYY-MM-DD format
  fact: string;
  thought: string;
  emotion: string;
  sensation: string;
  createdAt: number;
};

export type DailySummary = {
  date: string;
  summary: string;
  reflection: string;
};

interface JournalState {
  entries: JournalEntry[];
  summaries: Record<string, DailySummary>;
  weeklyReflections: Record<string, string>;
  monthlyReflections: Record<string, string>;
  yearlyReflections: Record<string, string>;
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  updateEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  setSummary: (date: string, summary: DailySummary) => void;
  setWeeklyReflection: (weekKey: string, reflection: string) => void;
  setMonthlyReflection: (monthKey: string, reflection: string) => void;
  setYearlyReflection: (yearKey: string, reflection: string) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      summaries: {},
      weeklyReflections: {},
      monthlyReflections: {},
      yearlyReflections: {},
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            { ...entry, id: uuidv4(), createdAt: Date.now() },
          ],
        })),
      updateEntry: (id, updatedEntry) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...updatedEntry } : e)),
        })),
      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      setSummary: (date, summary) =>
        set((state) => ({
          summaries: { ...state.summaries, [date]: summary },
        })),
      setWeeklyReflection: (weekKey, reflection) =>
        set((state) => ({
          weeklyReflections: { ...state.weeklyReflections, [weekKey]: reflection },
        })),
      setMonthlyReflection: (monthKey, reflection) =>
        set((state) => ({
          monthlyReflections: { ...state.monthlyReflections, [monthKey]: reflection },
        })),
      setYearlyReflection: (yearKey, reflection) =>
        set((state) => ({
          yearlyReflections: { ...state.yearlyReflections, [yearKey]: reflection },
        })),
    }),
    {
      name: 'journal-storage',
    }
  )
);
