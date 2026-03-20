import { randomUUID } from 'node:crypto';
import { addDays, format, parseISO } from 'date-fns';
import {
  createEmptyJournalSnapshot,
  type Card,
  type CreateCardInput,
  type Day,
  type JournalSnapshot,
  type MonthlySummary,
  type WeekRecord,
  type WeeklySummary,
  type YearRecord,
  type YearlySummary,
  type MonthRecord,
} from '../../../src/domain/journal';
import { notFoundError } from '../libs/errors';
import type { JournalDataRepository } from './journalRepository';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const replaceDay = (days: Day[], day: Day) =>
  [...days.filter((item) => item.date !== day.date), day].sort((left, right) => left.date.localeCompare(right.date));

const upsertWeeklySummary = (summaries: WeeklySummary[], weekKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.weekKey === weekKey);
  if (!existing) {
    return [...summaries, { weekKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.weekKey === weekKey ? { ...item, summary, updatedAt: now } : item));
};

const upsertMonthlySummary = (summaries: MonthlySummary[], monthKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.monthKey === monthKey);
  if (!existing) {
    return [...summaries, { monthKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.monthKey === monthKey ? { ...item, summary, updatedAt: now } : item));
};

const upsertYearlySummary = (summaries: YearlySummary[], yearKey: string, summary: string) => {
  const now = new Date().toISOString();
  const existing = summaries.find((item) => item.yearKey === yearKey);
  if (!existing) {
    return [...summaries, { yearKey, summary, createdAt: now, updatedAt: now }];
  }

  return summaries.map((item) => (item.yearKey === yearKey ? { ...item, summary, updatedAt: now } : item));
};

const sortSnapshot = (snapshot: JournalSnapshot): JournalSnapshot => ({
  days: [...snapshot.days].sort((left, right) => left.date.localeCompare(right.date)),
  weeklySummaries: [...snapshot.weeklySummaries].sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
  monthlySummaries: [...snapshot.monthlySummaries].sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
  yearlySummaries: [...snapshot.yearlySummaries].sort((left, right) => left.yearKey.localeCompare(right.yearKey)),
});

export class MemoryJournalRepository implements JournalDataRepository {
  private readonly snapshots = new Map<string, JournalSnapshot>();

  private getSnapshot(userId: string) {
    if (!this.snapshots.has(userId)) {
      this.snapshots.set(userId, createEmptyJournalSnapshot());
    }

    return this.snapshots.get(userId)!;
  }

  private setSnapshot(userId: string, snapshot: JournalSnapshot) {
    this.snapshots.set(userId, sortSnapshot(snapshot));
  }

  async getDay(userId: string, date: string) {
    const day = this.getSnapshot(userId).days.find((item) => item.date === date) ?? null;
    return clone(day);
  }

  async saveDay(userId: string, day: Day) {
    const nextDay = clone(day);
    const snapshot = this.getSnapshot(userId);
    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
    return clone(nextDay);
  }

  async saveDailySummary(userId: string, date: string, summary: string) {
    const snapshot = this.getSnapshot(userId);
    const current = snapshot.days.find((item) => item.date === date);
    const timestamp = new Date().toISOString();
    const nextDay: Day = current
      ? {
          ...current,
          dailySummary: summary,
          updatedAt: timestamp,
        }
      : {
          date,
          cards: [],
          dailySummary: summary,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
    return clone(nextDay);
  }

  async createCard(userId: string, date: string, input: CreateCardInput) {
    const snapshot = this.getSnapshot(userId);
    const timestamp = new Date().toISOString();
    const card: Card = {
      id: randomUUID(),
      fact: input.fact,
      thought: input.thought,
      emotion: input.emotion,
      bodySensation: input.bodySensation,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const currentDay = snapshot.days.find((item) => item.date === date);
    const nextDay: Day = currentDay
      ? {
          ...currentDay,
          cards: [...currentDay.cards, card],
          updatedAt: timestamp,
        }
      : {
          date,
          cards: [card],
          dailySummary: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });

    return clone(card);
  }

  async updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    const snapshot = this.getSnapshot(userId);
    const currentDay = snapshot.days.find((item) => item.date === date);
    const existing = currentDay?.cards.find((item) => item.id === cardId);
    if (!currentDay || !existing) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const timestamp = new Date().toISOString();
    const updatedCard: Card = {
      ...existing,
      fact: input.fact ?? existing.fact,
      thought: input.thought ?? existing.thought,
      emotion: input.emotion ?? existing.emotion,
      bodySensation: input.bodySensation ?? existing.bodySensation,
      updatedAt: timestamp,
    };

    const nextDay: Day = {
      ...currentDay,
      updatedAt: timestamp,
      cards: currentDay.cards.map((item) => (item.id === cardId ? updatedCard : item)),
    };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });

    return clone(updatedCard);
  }

  async deleteCard(userId: string, date: string, cardId: string) {
    const snapshot = this.getSnapshot(userId);
    const currentDay = snapshot.days.find((item) => item.date === date);
    if (!currentDay?.cards.some((item) => item.id === cardId)) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const timestamp = new Date().toISOString();
    const nextDay: Day = {
      ...currentDay,
      updatedAt: timestamp,
      cards: currentDay.cards.filter((item) => item.id !== cardId),
    };

    this.setSnapshot(userId, {
      ...snapshot,
      days: replaceDay(snapshot.days, nextDay),
    });
  }

  async getWeek(userId: string, weekKey: string): Promise<WeekRecord> {
    const snapshot = this.getSnapshot(userId);
    const days = Array.from({ length: 7 }, (_, index) => {
      const dayKey = format(addDays(parseISO(weekKey), index), 'yyyy-MM-dd');
      return snapshot.days.find((item) => item.date === dayKey);
    }).filter((day): day is Day => Boolean(day));

    return clone({
      weekKey,
      summary: snapshot.weeklySummaries.find((item) => item.weekKey === weekKey),
      days,
    });
  }

  async saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      weeklySummaries: upsertWeeklySummary(snapshot.weeklySummaries, weekKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getWeek(userId, weekKey);
  }

  async getMonth(userId: string, monthKey: string): Promise<MonthRecord> {
    const snapshot = this.getSnapshot(userId);
    return clone({
      monthKey,
      summary: snapshot.monthlySummaries.find((item) => item.monthKey === monthKey),
      weeklySummaries: snapshot.weeklySummaries.filter((item) => item.weekKey.startsWith(monthKey)),
      days: snapshot.days.filter((item) => item.date.startsWith(monthKey)),
    });
  }

  async saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      monthlySummaries: upsertMonthlySummary(snapshot.monthlySummaries, monthKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getMonth(userId, monthKey);
  }

  async getYear(userId: string, yearKey: string): Promise<YearRecord> {
    const snapshot = this.getSnapshot(userId);
    return clone({
      yearKey,
      summary: snapshot.yearlySummaries.find((item) => item.yearKey === yearKey),
      monthlySummaries: snapshot.monthlySummaries.filter((item) => item.monthKey.startsWith(yearKey)),
    });
  }

  async saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord> {
    const snapshot = this.getSnapshot(userId);
    const nextSnapshot = {
      ...snapshot,
      yearlySummaries: upsertYearlySummary(snapshot.yearlySummaries, yearKey, summary),
    };
    this.setSnapshot(userId, nextSnapshot);
    return this.getYear(userId, yearKey);
  }

  async importSnapshot(userId: string, snapshot: JournalSnapshot) {
    this.setSnapshot(userId, clone(snapshot));
    return clone(this.getSnapshot(userId));
  }
}
