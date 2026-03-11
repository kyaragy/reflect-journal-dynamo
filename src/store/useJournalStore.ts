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
import { journalRepository } from '../repositories';

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
  ...snapshotToState(journalRepository.getState()),
  addEntry: (entry) => {
    journalRepository.createCard(entry.date, entry);
    set(snapshotToState(journalRepository.getState()));
  },
  updateEntry: (date, id, updatedEntry) => {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    journalRepository.updateCard(date, id, updatedEntry);
    set(snapshotToState(journalRepository.getState()));
  },
  deleteEntry: (date, id) => {
    const currentDay = get().days.find((day) => day.date === date);
    if (!currentDay?.cards.find((card) => card.id === id)) {
      return;
    }

    journalRepository.deleteCard(date, id);
    set(snapshotToState(journalRepository.getState()));
  },
  setSummary: (date, summary) => {
    journalRepository.saveDailySummary(date, summary);
    set(snapshotToState(journalRepository.getState()));
  },
  setWeeklyReflection: (weekKey, reflection) => {
    journalRepository.saveWeekSummary(weekKey, reflection);
    set(snapshotToState(journalRepository.getState()));
  },
  setMonthlyReflection: (monthKey, reflection) => {
    journalRepository.saveMonthSummary(monthKey, reflection);
    set(snapshotToState(journalRepository.getState()));
  },
  setYearlyReflection: (yearKey, reflection) => {
    journalRepository.saveYearSummary(yearKey, reflection);
    set(snapshotToState(journalRepository.getState()));
  },
}));
