import { create } from 'zustand';
import type { DailySummary, JournalEntry, JournalSnapshot } from '../domain/journal';
import { localStorageRepository } from '../repositories/localStorageRepository';

export type { DailySummary, JournalEntry } from '../domain/journal';

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

const snapshotToState = (snapshot: JournalSnapshot) => ({
  entries: snapshot.entries,
  summaries: snapshot.summaries,
  weeklyReflections: snapshot.weeklyReflections,
  monthlyReflections: snapshot.monthlyReflections,
  yearlyReflections: snapshot.yearlyReflections,
});

export const useJournalStore = create<JournalState>()((set, get) => ({
  ...snapshotToState(localStorageRepository.getState()),
  addEntry: (entry) => {
    localStorageRepository.createCard(entry.date, entry);
    set(snapshotToState(localStorageRepository.getState()));
  },
  updateEntry: (id, updatedEntry) => {
    const currentEntry = get().entries.find((entry) => entry.id === id);
    if (!currentEntry) {
      return;
    }

    localStorageRepository.updateCard(currentEntry.date, id, updatedEntry);
    set(snapshotToState(localStorageRepository.getState()));
  },
  deleteEntry: (id) => {
    const currentEntry = get().entries.find((entry) => entry.id === id);
    if (!currentEntry) {
      return;
    }

    localStorageRepository.deleteCard(currentEntry.date, id);
    set(snapshotToState(localStorageRepository.getState()));
  },
  setSummary: (date, summary) => {
    localStorageRepository.saveDailySummary(date, summary);
    set(snapshotToState(localStorageRepository.getState()));
  },
  setWeeklyReflection: (weekKey, reflection) => {
    localStorageRepository.saveWeekSummary(weekKey, reflection);
    set(snapshotToState(localStorageRepository.getState()));
  },
  setMonthlyReflection: (monthKey, reflection) => {
    localStorageRepository.saveMonthSummary(monthKey, reflection);
    set(snapshotToState(localStorageRepository.getState()));
  },
  setYearlyReflection: (yearKey, reflection) => {
    localStorageRepository.saveYearSummary(yearKey, reflection);
    set(snapshotToState(localStorageRepository.getState()));
  },
}));
