import test from 'node:test';
import assert from 'node:assert/strict';
import { JournalService } from './journalService';
import { createEmptyJournalSnapshot, type Day } from '../../../src/domain/journal';
import type { JournalDataRepository } from '../repositories/journalRepository';

const dayFixture: Day = {
  date: '2026-03-10',
  dailySummary: 'summary',
  createdAt: '2026-03-10T00:00:00.000Z',
  updatedAt: '2026-03-10T00:00:00.000Z',
  cards: [],
};

const createRepositoryStub = (): JournalDataRepository => ({
  async getDay() {
    return dayFixture;
  },
  async saveDay(_userId, day) {
    return day;
  },
  async saveDailySummary() {
    return dayFixture;
  },
  async createCard() {
    throw new Error('not implemented');
  },
  async updateCard() {
    return null;
  },
  async deleteCard() {},
  async getWeek() {
    return { weekKey: '2026-03-08', days: [], summary: undefined };
  },
  async saveWeekSummary() {
    return { weekKey: '2026-03-08', days: [], summary: undefined };
  },
  async getMonth() {
    return { monthKey: '2026-03', days: [], weeklySummaries: [], summary: undefined };
  },
  async saveMonthSummary() {
    return { monthKey: '2026-03', days: [], weeklySummaries: [], summary: undefined };
  },
  async getYear() {
    return { yearKey: '2026', monthlySummaries: [], summary: undefined };
  },
  async saveYearSummary() {
    return { yearKey: '2026', monthlySummaries: [], summary: undefined };
  },
  async importSnapshot() {
    return createEmptyJournalSnapshot();
  },
});

test('saveDay uses the path date instead of trusting the request payload date', async () => {
  const service = new JournalService(createRepositoryStub());
  const result = await service.saveDay('user-1', '2026-03-11', {
    ...dayFixture,
    date: '2026-03-10',
  });

  assert.equal(result.date, '2026-03-11');
});
