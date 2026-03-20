import { addDays, eachWeekOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth } from 'date-fns';
import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthRecord,
  MonthlySummary,
  WeekRecord,
  WeeklySummary,
  YearRecord,
  YearlySummary,
} from '../../../src/domain/journal';
import { DynamoDbClient } from '../db/dynamoDbClient';
import { notFoundError } from '../libs/errors';
import type { JournalDataRepository } from './journalRepository';

type DayItem = {
  PK: string;
  SK: string;
  entityType: 'DAY';
  date: string;
  dailySummary: string;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
};

type WeeklySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'WEEKLY_SUMMARY';
  weekKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type MonthlySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'MONTHLY_SUMMARY';
  monthKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type YearlySummaryItem = {
  PK: string;
  SK: string;
  entityType: 'YEARLY_SUMMARY';
  yearKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

type JournalItem = DayItem | WeeklySummaryItem | MonthlySummaryItem | YearlySummaryItem;

const toUserPk = (userId: string) => `USER#${userId}`;
const toDaySk = (date: string) => `DAY#${date}`;
const toWeekSk = (weekKey: string) => `WEEK#${weekKey}`;
const toMonthSk = (monthKey: string) => `MONTH#${monthKey}`;
const toYearSk = (yearKey: string) => `YEAR#${yearKey}`;

const toDayItem = (userId: string, day: Day): DayItem => ({
  PK: toUserPk(userId),
  SK: toDaySk(day.date),
  entityType: 'DAY',
  date: day.date,
  dailySummary: day.dailySummary,
  cards: day.cards,
  createdAt: day.createdAt,
  updatedAt: day.updatedAt,
});

const toDay = (item: DayItem): Day => ({
  date: item.date,
  dailySummary: item.dailySummary,
  cards: item.cards ?? [],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const toWeeklySummary = (item?: WeeklySummaryItem): WeeklySummary | undefined =>
  item
    ? {
        weekKey: item.weekKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const toMonthlySummary = (item?: MonthlySummaryItem): MonthlySummary | undefined =>
  item
    ? {
        monthKey: item.monthKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const toYearlySummary = (item?: YearlySummaryItem): YearlySummary | undefined =>
  item
    ? {
        yearKey: item.yearKey,
        summary: item.summary,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    : undefined;

const createEmptyDay = (date: string, now: string): Day => ({
  date,
  dailySummary: '',
  cards: [],
  createdAt: now,
  updatedAt: now,
});

export class DynamoDbJournalRepository implements JournalDataRepository {
  constructor(private readonly client: DynamoDbClient) {}

  async getDay(userId: string, date: string) {
    const item = await this.client.getItem<DayItem>({
      PK: toUserPk(userId),
      SK: toDaySk(date),
    });
    return item ? toDay(item) : null;
  }

  async saveDay(userId: string, day: Day) {
    await this.client.putItem(toDayItem(userId, day));
    return day;
  }

  async saveDailySummary(userId: string, date: string, summary: string) {
    const now = new Date().toISOString();
    const current = (await this.getDay(userId, date)) ?? createEmptyDay(date, now);
    const nextDay: Day = {
      ...current,
      dailySummary: summary,
      updatedAt: now,
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return nextDay;
  }

  async createCard(userId: string, date: string, input: CreateCardInput) {
    const now = new Date().toISOString();
    const day = (await this.getDay(userId, date)) ?? createEmptyDay(date, now);
    const card: Card = {
      id: crypto.randomUUID(),
      fact: input.fact,
      thought: input.thought,
      emotion: input.emotion,
      bodySensation: input.bodySensation,
      createdAt: now,
      updatedAt: now,
    };

    const nextDay: Day = {
      ...day,
      cards: [...day.cards, card],
      updatedAt: now,
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return card;
  }

  async updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    const day = await this.getDay(userId, date);
    const existing = day?.cards.find((card) => card.id === cardId);
    if (!day || !existing) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const updatedCard: Card = {
      ...existing,
      fact: input.fact ?? existing.fact,
      thought: input.thought ?? existing.thought,
      emotion: input.emotion ?? existing.emotion,
      bodySensation: input.bodySensation ?? existing.bodySensation,
      updatedAt: new Date().toISOString(),
    };

    const nextDay: Day = {
      ...day,
      updatedAt: updatedCard.updatedAt,
      cards: day.cards.map((card) => (card.id === cardId ? updatedCard : card)),
    };

    await this.client.putItem(toDayItem(userId, nextDay));
    return updatedCard;
  }

  async deleteCard(userId: string, date: string, cardId: string) {
    const day = await this.getDay(userId, date);
    if (!day?.cards.some((card) => card.id === cardId)) {
      throw notFoundError('Card not found', { date, cardId });
    }

    await this.client.putItem(
      toDayItem(userId, {
        ...day,
        updatedAt: new Date().toISOString(),
        cards: day.cards.filter((card) => card.id !== cardId),
      })
    );
  }

  async getWeek(userId: string, weekKey: string): Promise<WeekRecord> {
    const endDate = format(endOfWeek(parseISO(weekKey), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const [days, weeklySummaryItem] = await Promise.all([
      this.client.queryBetween<DayItem>(toUserPk(userId), toDaySk(weekKey), toDaySk(endDate)),
      this.client.getItem<WeeklySummaryItem>({
        PK: toUserPk(userId),
        SK: toWeekSk(weekKey),
      }),
    ]);

    return {
      weekKey,
      days: days.map(toDay),
      summary: toWeeklySummary(weeklySummaryItem),
    };
  }

  async saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<WeeklySummaryItem>({
      PK: toUserPk(userId),
      SK: toWeekSk(weekKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toWeekSk(weekKey),
      entityType: 'WEEKLY_SUMMARY',
      weekKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies WeeklySummaryItem);

    return this.getWeek(userId, weekKey);
  }

  async getMonth(userId: string, monthKey: string): Promise<MonthRecord> {
    const pk = toUserPk(userId);
    const startDate = parseISO(`${monthKey}-01`);
    const endDate = endOfMonth(startDate);
    const weekKeys = eachWeekOfInterval(
      {
        start: startDate,
        end: endDate,
      },
      { weekStartsOn: 0 }
    ).map((date) => format(date, 'yyyy-MM-dd'));

    const [days, monthSummaryItem, weeklySummaryItems] = await Promise.all([
      this.client.queryByPrefix<DayItem>(pk, `DAY#${monthKey}`),
      this.client.getItem<MonthlySummaryItem>({
        PK: pk,
        SK: toMonthSk(monthKey),
      }),
      this.client.batchGetItems<WeeklySummaryItem>(
        weekKeys.map((weekKey) => ({
          PK: pk,
          SK: toWeekSk(weekKey),
        }))
      ),
    ]);

    return {
      monthKey,
      days: days.map(toDay),
      weeklySummaries: weeklySummaryItems
        .map((item) => toWeeklySummary(item))
        .filter((item): item is WeeklySummary => Boolean(item))
        .sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
      summary: toMonthlySummary(monthSummaryItem),
    };
  }

  async saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<MonthlySummaryItem>({
      PK: toUserPk(userId),
      SK: toMonthSk(monthKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toMonthSk(monthKey),
      entityType: 'MONTHLY_SUMMARY',
      monthKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies MonthlySummaryItem);

    return this.getMonth(userId, monthKey);
  }

  async getYear(userId: string, yearKey: string): Promise<YearRecord> {
    const [monthlySummaryItems, yearlySummaryItem] = await Promise.all([
      this.client.queryByPrefix<MonthlySummaryItem>(toUserPk(userId), `MONTH#${yearKey}`),
      this.client.getItem<YearlySummaryItem>({
        PK: toUserPk(userId),
        SK: toYearSk(yearKey),
      }),
    ]);

    return {
      yearKey,
      monthlySummaries: monthlySummaryItems
        .map((item) => toMonthlySummary(item))
        .filter((item): item is MonthlySummary => Boolean(item))
        .sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
      summary: toYearlySummary(yearlySummaryItem),
    };
  }

  async saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord> {
    const now = new Date().toISOString();
    const existing = await this.client.getItem<YearlySummaryItem>({
      PK: toUserPk(userId),
      SK: toYearSk(yearKey),
    });

    await this.client.putItem({
      PK: toUserPk(userId),
      SK: toYearSk(yearKey),
      entityType: 'YEARLY_SUMMARY',
      yearKey,
      summary,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } satisfies YearlySummaryItem);

    return this.getYear(userId, yearKey);
  }

  async importSnapshot(userId: string, snapshot: JournalSnapshot) {
    const pk = toUserPk(userId);
    const existingItems = await this.client.queryByPartition<JournalItem>(pk);

    await Promise.all(
      existingItems.map((item) =>
        this.client.deleteItem({
          PK: item.PK,
          SK: item.SK,
        })
      )
    );

    await Promise.all(snapshot.days.map((day) => this.client.putItem(toDayItem(userId, day))));
    await Promise.all(
      snapshot.weeklySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toWeekSk(summary.weekKey),
          entityType: 'WEEKLY_SUMMARY',
          weekKey: summary.weekKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies WeeklySummaryItem)
      )
    );
    await Promise.all(
      snapshot.monthlySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toMonthSk(summary.monthKey),
          entityType: 'MONTHLY_SUMMARY',
          monthKey: summary.monthKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies MonthlySummaryItem)
      )
    );
    await Promise.all(
      snapshot.yearlySummaries.map((summary) =>
        this.client.putItem({
          PK: pk,
          SK: toYearSk(summary.yearKey),
          entityType: 'YEARLY_SUMMARY',
          yearKey: summary.yearKey,
          summary: summary.summary,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt,
        } satisfies YearlySummaryItem)
      )
    );

    return {
      days: snapshot.days.sort((left, right) => left.date.localeCompare(right.date)),
      weeklySummaries: snapshot.weeklySummaries.sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
      monthlySummaries: snapshot.monthlySummaries.sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
      yearlySummaries: snapshot.yearlySummaries.sort((left, right) => left.yearKey.localeCompare(right.yearKey)),
    };
  }
}
