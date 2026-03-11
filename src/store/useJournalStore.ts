import { create } from 'zustand';
import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthlySummary,
  WeeklySummary,
  YearlySummary,
} from '../domain/journal';
import { localStorageRepository } from '../repositories/localStorageRepository';

export type { Card, Day, MonthlySummary, WeeklySummary, YearlySummary } from '../domain/journal';

interface JournalState {
  days: Day[];
  weeklySummaries: WeeklySummary[];
  monthlySummaries: MonthlySummary[];
  yearlySummaries: YearlySummary[];
  addEntry: (entry: CreateCardInput & { date: string }) => void;
  updateEntry: (date: string, id: string, entry: Partial<Card>) => void;
  deleteEntry: (date: string, id: string) => void;
  setSummary: (date: string, summary: string) => void;
  setWeeklyReflection: (weekKey: string, reflection: string) => void;
  setMonthlyReflection: (monthKey: string, reflection: string) => void;
  setYearlyReflection: (yearKey: string, reflection: string) => void;
}

const snapshotToState = (snapshot: JournalSnapshot) => ({
  days: snapshot.days,
  weeklySummaries: snapshot.weeklySummaries,
  monthlySummaries: snapshot.monthlySummaries,
  yearlySummaries: snapshot.yearlySummaries,
});

export const useJournalStore = create<JournalState>()((set, get) => ({
  ...snapshotToState(localStorageRepository.getState()),
  addEntry: (entry) => {
    localStorageRepository.createCard(entry.date, entry);
    set(snapshotToState(localStorageRepository.getState()));
  },
  updateEntry: (date, id, updatedEntry) => {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    localStorageRepository.updateCard(date, id, updatedEntry);
    set(snapshotToState(localStorageRepository.getState()));
  },
  deleteEntry: (date, id) => {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    localStorageRepository.deleteCard(date, id);
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
