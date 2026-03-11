import { createEmptyJournalSnapshot } from '../../domain/journal';
import { apiClient } from '../../lib/apiClient';
import type { JournalRepository } from '../journalRepository';

const createNotImplementedError = (methodName: string) =>
  new Error(`${methodName} is not implemented for apiRepository yet.`);

export const apiRepository: JournalRepository = {
  getState() {
    void apiClient;
    return createEmptyJournalSnapshot();
  },

  getDay() {
    return null;
  },

  saveDay() {
    throw createNotImplementedError('saveDay');
  },

  getWeek(weekKey) {
    return {
      weekKey,
      days: [],
    };
  },

  saveWeekSummary() {
    throw createNotImplementedError('saveWeekSummary');
  },

  getMonth(monthKey) {
    return {
      monthKey,
      days: [],
      weeklySummaries: [],
    };
  },

  saveMonthSummary() {
    throw createNotImplementedError('saveMonthSummary');
  },

  getYear(yearKey) {
    return {
      yearKey,
      monthlySummaries: [],
    };
  },

  saveYearSummary() {
    throw createNotImplementedError('saveYearSummary');
  },

  createCard() {
    throw createNotImplementedError('createCard');
  },

  updateCard() {
    throw createNotImplementedError('updateCard');
  },

  deleteCard() {
    throw createNotImplementedError('deleteCard');
  },

  saveDailySummary() {
    throw createNotImplementedError('saveDailySummary');
  },
};
