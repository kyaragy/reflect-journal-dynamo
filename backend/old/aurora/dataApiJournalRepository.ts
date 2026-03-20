import { randomUUID } from 'node:crypto';
import { addDays, endOfMonth, format, parseISO } from 'date-fns';
import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../../../src/domain/journal';
import { DataApiClient, numberParam, stringParam } from '../db/dataApiClient';
import { notFoundError } from '../libs/errors';
import {
  mapDayRows,
  mapMonthlySummary,
  mapWeeklySummary,
  mapYearlySummary,
  toSnapshot,
  type DayWithCardsRow,
  type SummaryRow,
} from './mappers';

export interface JournalDataRepository {
  getBootstrap(userId: string): Promise<JournalSnapshot>;
  getDay(userId: string, date: string): Promise<Day | null>;
  saveDay(userId: string, day: Day): Promise<Day>;
  saveDailySummary(userId: string, date: string, summary: string): Promise<Day>;
  createCard(userId: string, date: string, input: CreateCardInput): Promise<Card>;
  updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>): Promise<Card | null>;
  deleteCard(userId: string, date: string, cardId: string): Promise<void>;
  getWeek(userId: string, weekKey: string): Promise<WeekRecord>;
  saveWeekSummary(userId: string, weekKey: string, summary: string): Promise<WeekRecord>;
  getMonth(userId: string, monthKey: string): Promise<MonthRecord>;
  saveMonthSummary(userId: string, monthKey: string, summary: string): Promise<MonthRecord>;
  getYear(userId: string, yearKey: string): Promise<YearRecord>;
  saveYearSummary(userId: string, yearKey: string, summary: string): Promise<YearRecord>;
  importSnapshot(userId: string, snapshot: JournalSnapshot): Promise<JournalSnapshot>;
}

const daySelectSql = `
  SELECT
    d.date,
    d.daily_summary,
    to_char(d.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS day_created_at,
    to_char(d.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS day_updated_at,
    c.id AS card_id,
    c.fact,
    c.thought,
    c.emotion,
    c.body_sensation,
    to_char(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS card_created_at,
    to_char(c.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS card_updated_at
  FROM journal_days d
  LEFT JOIN journal_cards c
    ON c.user_id = d.user_id
   AND c.date = d.date
  WHERE d.user_id = :userId
`;

export class DataApiJournalRepository implements JournalDataRepository {
  constructor(private readonly dataApiClient: DataApiClient) {}

  async getBootstrap(userId: string) {
    const [days, weeklySummaries, monthlySummaries, yearlySummaries] = await Promise.all([
      this.getDaysForUser(userId),
      this.getWeeklySummaries(userId),
      this.getMonthlySummaries(userId),
      this.getYearlySummaries(userId),
    ]);

    return toSnapshot({
      days,
      weeklySummaries,
      monthlySummaries,
      yearlySummaries,
    });
  }

  async getDay(userId: string, date: string) {
    return this.getDayInternal(userId, date);
  }

  async saveDay(userId: string, day: Day) {
    return this.dataApiClient.transaction(async (transactionId) => {
      await this.ensureUser(userId, transactionId);
      await this.dataApiClient.execute(
        `
          INSERT INTO journal_days (user_id, date, daily_summary, created_at, updated_at)
          VALUES (:userId, CAST(:date AS DATE), :dailySummary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          ON CONFLICT (user_id, date)
          DO UPDATE SET
            daily_summary = EXCLUDED.daily_summary,
            updated_at = EXCLUDED.updated_at
        `,
        [
          stringParam('userId', userId),
          stringParam('date', day.date),
          stringParam('dailySummary', day.dailySummary),
          stringParam('createdAt', day.createdAt),
          stringParam('updatedAt', day.updatedAt),
        ],
        transactionId
      );

      await this.dataApiClient.execute(
        `DELETE FROM journal_cards WHERE user_id = :userId AND date = CAST(:date AS DATE)`,
        [stringParam('userId', userId), stringParam('date', day.date)],
        transactionId
      );

      for (const [index, card] of day.cards.entries()) {
        await this.insertCard(userId, day.date, card, index, transactionId);
      }

      const savedDay = await this.getDayInternal(userId, day.date, transactionId);
      if (!savedDay) {
        throw new Error(`Failed to reload saved day ${day.date}`);
      }
      return savedDay;
    });
  }

  async saveDailySummary(userId: string, date: string, summary: string) {
    const current = await this.getDayInternal(userId, date);
    const timestamp = new Date().toISOString();

    await this.dataApiClient.transaction(async (transactionId) => {
      await this.ensureUser(userId, transactionId);
      await this.dataApiClient.execute(
        `
          INSERT INTO journal_days (user_id, date, daily_summary, created_at, updated_at)
          VALUES (:userId, CAST(:date AS DATE), :dailySummary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          ON CONFLICT (user_id, date)
          DO UPDATE SET
            daily_summary = EXCLUDED.daily_summary,
            updated_at = EXCLUDED.updated_at
        `,
        [
          stringParam('userId', userId),
          stringParam('date', date),
          stringParam('dailySummary', summary),
          stringParam('createdAt', current?.createdAt ?? timestamp),
          stringParam('updatedAt', timestamp),
        ],
        transactionId
      );
    });

    const day = await this.getDayInternal(userId, date);
    if (!day) {
      throw new Error(`Failed to load day ${date}`);
    }
    return day;
  }

  async createCard(userId: string, date: string, input: CreateCardInput) {
    const timestamp = new Date().toISOString();
    const id = randomUUID();

    const rows = await this.dataApiClient.transaction(async (transactionId) => {
      await this.ensureUser(userId, transactionId);
      await this.touchDay(userId, date, timestamp, transactionId);
      return this.dataApiClient.query<Card & { sort_order: number }>(
        `
          INSERT INTO journal_cards (
            id,
            user_id,
            date,
            sort_order,
            fact,
            thought,
            emotion,
            body_sensation,
            created_at,
            updated_at
          )
          VALUES (
            CAST(:id AS UUID),
            :userId,
            CAST(:date AS DATE),
            COALESCE((SELECT MAX(sort_order) + 1 FROM journal_cards WHERE user_id = :userId AND date = CAST(:date AS DATE)), 0),
            :fact,
            :thought,
            :emotion,
            :bodySensation,
            CAST(:createdAt AS TIMESTAMPTZ),
            CAST(:updatedAt AS TIMESTAMPTZ)
          )
          RETURNING
            id,
            fact,
            thought,
            emotion,
            body_sensation AS "bodySensation",
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
            to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt",
            sort_order
        `,
        [
          stringParam('id', id),
          stringParam('userId', userId),
          stringParam('date', date),
          stringParam('fact', input.fact),
          stringParam('thought', input.thought),
          stringParam('emotion', input.emotion),
          stringParam('bodySensation', input.bodySensation),
          stringParam('createdAt', timestamp),
          stringParam('updatedAt', timestamp),
        ],
        transactionId
      );
    });

    const [created] = rows;
    return created;
  }

  async updateCard(userId: string, date: string, cardId: string, input: Partial<CreateCardInput>) {
    const existing = await this.getCard(userId, date, cardId);
    if (!existing) {
      throw notFoundError('Card not found', { date, cardId });
    }

    const timestamp = new Date().toISOString();
    const rows = await this.dataApiClient.query<Card>(
      `
        UPDATE journal_cards
        SET
          fact = :fact,
          thought = :thought,
          emotion = :emotion,
          body_sensation = :bodySensation,
          updated_at = CAST(:updatedAt AS TIMESTAMPTZ)
        WHERE user_id = :userId
          AND date = CAST(:date AS DATE)
          AND id = CAST(:cardId AS UUID)
        RETURNING
          id,
          fact,
          thought,
          emotion,
          body_sensation AS "bodySensation",
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
      `,
      [
        stringParam('fact', input.fact ?? existing.fact),
        stringParam('thought', input.thought ?? existing.thought),
        stringParam('emotion', input.emotion ?? existing.emotion),
        stringParam('bodySensation', input.bodySensation ?? existing.bodySensation),
        stringParam('updatedAt', timestamp),
        stringParam('userId', userId),
        stringParam('date', date),
        stringParam('cardId', cardId),
      ]
    );

    const [updated] = rows;
    if (!updated) {
      return null;
    }

    await this.dataApiClient.execute(
      `UPDATE journal_days SET updated_at = CAST(:updatedAt AS TIMESTAMPTZ) WHERE user_id = :userId AND date = CAST(:date AS DATE)`,
      [stringParam('updatedAt', timestamp), stringParam('userId', userId), stringParam('date', date)]
    );

    return updated;
  }

  async deleteCard(userId: string, date: string, cardId: string) {
    const rows = await this.dataApiClient.query<{ id: string }>(
      `
        DELETE FROM journal_cards
        WHERE user_id = :userId
          AND date = CAST(:date AS DATE)
          AND id = CAST(:cardId AS UUID)
        RETURNING id
      `,
      [stringParam('userId', userId), stringParam('date', date), stringParam('cardId', cardId)]
    );

    if (!rows[0]) {
      throw notFoundError('Card not found', { date, cardId });
    }

    await this.dataApiClient.execute(
      `UPDATE journal_days SET updated_at = CAST(:updatedAt AS TIMESTAMPTZ) WHERE user_id = :userId AND date = CAST(:date AS DATE)`,
      [
        stringParam('updatedAt', new Date().toISOString()),
        stringParam('userId', userId),
        stringParam('date', date),
      ]
    );
  }

  async getWeek(userId: string, weekKey: string) {
    const endDate = format(addDays(parseISO(weekKey), 6), 'yyyy-MM-dd');
    const [days, summaryRow] = await Promise.all([
      this.getDaysByDateRange(userId, weekKey, endDate),
      this.getWeeklySummaryRow(userId, weekKey),
    ]);

    return {
      weekKey,
      summary: mapWeeklySummary(weekKey, summaryRow),
      days,
    };
  }

  async saveWeekSummary(userId: string, weekKey: string, summary: string) {
    const timestamp = new Date().toISOString();
    await this.ensureUser(userId);
    await this.dataApiClient.execute(
      `
        INSERT INTO weekly_summaries (user_id, week_key, summary, created_at, updated_at)
        VALUES (:userId, CAST(:weekKey AS DATE), :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
        ON CONFLICT (user_id, week_key)
        DO UPDATE SET
          summary = EXCLUDED.summary,
          updated_at = EXCLUDED.updated_at
      `,
      [
        stringParam('userId', userId),
        stringParam('weekKey', weekKey),
        stringParam('summary', summary),
        stringParam('createdAt', timestamp),
        stringParam('updatedAt', timestamp),
      ]
    );

    return this.getWeek(userId, weekKey);
  }

  async getMonth(userId: string, monthKey: string) {
    const monthStart = `${monthKey}-01`;
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd');
    const [days, monthlySummaryRow, weeklySummaries] = await Promise.all([
      this.getDaysByDateRange(userId, monthStart, monthEnd),
      this.getMonthlySummaryRow(userId, monthKey),
      this.getWeeklySummaries(userId, monthKey),
    ]);

    return {
      monthKey,
      summary: mapMonthlySummary(monthKey, monthlySummaryRow),
      weeklySummaries,
      days,
    };
  }

  async saveMonthSummary(userId: string, monthKey: string, summary: string) {
    const timestamp = new Date().toISOString();
    await this.ensureUser(userId);
    await this.dataApiClient.execute(
      `
        INSERT INTO monthly_summaries (user_id, month_key, summary, created_at, updated_at)
        VALUES (:userId, :monthKey, :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
        ON CONFLICT (user_id, month_key)
        DO UPDATE SET
          summary = EXCLUDED.summary,
          updated_at = EXCLUDED.updated_at
      `,
      [
        stringParam('userId', userId),
        stringParam('monthKey', monthKey),
        stringParam('summary', summary),
        stringParam('createdAt', timestamp),
        stringParam('updatedAt', timestamp),
      ]
    );

    return this.getMonth(userId, monthKey);
  }

  async getYear(userId: string, yearKey: string) {
    const [monthlySummaries, yearlySummaryRow] = await Promise.all([
      this.getMonthlySummaries(userId, `${yearKey}-`),
      this.getYearlySummaryRow(userId, yearKey),
    ]);

    return {
      yearKey,
      summary: mapYearlySummary(yearKey, yearlySummaryRow),
      monthlySummaries,
    };
  }

  async saveYearSummary(userId: string, yearKey: string, summary: string) {
    const timestamp = new Date().toISOString();
    await this.ensureUser(userId);
    await this.dataApiClient.execute(
      `
        INSERT INTO yearly_summaries (user_id, year_key, summary, created_at, updated_at)
        VALUES (:userId, :yearKey, :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
        ON CONFLICT (user_id, year_key)
        DO UPDATE SET
          summary = EXCLUDED.summary,
          updated_at = EXCLUDED.updated_at
      `,
      [
        stringParam('userId', userId),
        stringParam('yearKey', yearKey),
        stringParam('summary', summary),
        stringParam('createdAt', timestamp),
        stringParam('updatedAt', timestamp),
      ]
    );

    return this.getYear(userId, yearKey);
  }

  async importSnapshot(userId: string, snapshot: JournalSnapshot) {
    await this.dataApiClient.transaction(async (transactionId) => {
      await this.ensureUser(userId, transactionId);
      await this.dataApiClient.execute(`DELETE FROM journal_cards WHERE user_id = :userId`, [stringParam('userId', userId)], transactionId);
      await this.dataApiClient.execute(`DELETE FROM journal_days WHERE user_id = :userId`, [stringParam('userId', userId)], transactionId);
      await this.dataApiClient.execute(`DELETE FROM weekly_summaries WHERE user_id = :userId`, [stringParam('userId', userId)], transactionId);
      await this.dataApiClient.execute(`DELETE FROM monthly_summaries WHERE user_id = :userId`, [stringParam('userId', userId)], transactionId);
      await this.dataApiClient.execute(`DELETE FROM yearly_summaries WHERE user_id = :userId`, [stringParam('userId', userId)], transactionId);

      for (const day of snapshot.days) {
        await this.dataApiClient.execute(
          `
            INSERT INTO journal_days (user_id, date, daily_summary, created_at, updated_at)
            VALUES (:userId, CAST(:date AS DATE), :dailySummary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          `,
          [
            stringParam('userId', userId),
            stringParam('date', day.date),
            stringParam('dailySummary', day.dailySummary),
            stringParam('createdAt', day.createdAt),
            stringParam('updatedAt', day.updatedAt),
          ],
          transactionId
        );

        for (const [index, card] of day.cards.entries()) {
          await this.insertCard(userId, day.date, card, index, transactionId);
        }
      }

      for (const summary of snapshot.weeklySummaries) {
        await this.dataApiClient.execute(
          `
            INSERT INTO weekly_summaries (user_id, week_key, summary, created_at, updated_at)
            VALUES (:userId, CAST(:weekKey AS DATE), :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          `,
          [
            stringParam('userId', userId),
            stringParam('weekKey', summary.weekKey),
            stringParam('summary', summary.summary),
            stringParam('createdAt', summary.createdAt),
            stringParam('updatedAt', summary.updatedAt),
          ],
          transactionId
        );
      }

      for (const summary of snapshot.monthlySummaries) {
        await this.dataApiClient.execute(
          `
            INSERT INTO monthly_summaries (user_id, month_key, summary, created_at, updated_at)
            VALUES (:userId, :monthKey, :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          `,
          [
            stringParam('userId', userId),
            stringParam('monthKey', summary.monthKey),
            stringParam('summary', summary.summary),
            stringParam('createdAt', summary.createdAt),
            stringParam('updatedAt', summary.updatedAt),
          ],
          transactionId
        );
      }

      for (const summary of snapshot.yearlySummaries) {
        await this.dataApiClient.execute(
          `
            INSERT INTO yearly_summaries (user_id, year_key, summary, created_at, updated_at)
            VALUES (:userId, :yearKey, :summary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
          `,
          [
            stringParam('userId', userId),
            stringParam('yearKey', summary.yearKey),
            stringParam('summary', summary.summary),
            stringParam('createdAt', summary.createdAt),
            stringParam('updatedAt', summary.updatedAt),
          ],
          transactionId
        );
      }
    });

    return this.getBootstrap(userId);
  }

  private async getDayInternal(userId: string, date: string, transactionId?: string) {
    const rows = await this.dataApiClient.query<DayWithCardsRow>(
      `${daySelectSql} AND d.date = CAST(:date AS DATE) ORDER BY d.date, c.sort_order, c.created_at, c.id`,
      [stringParam('userId', userId), stringParam('date', date)],
      transactionId
    );

    return mapDayRows(rows)[0] ?? null;
  }

  private async ensureUser(userId: string, transactionId?: string) {
    const timestamp = new Date().toISOString();
    await this.dataApiClient.execute(
      `
        INSERT INTO users (id, created_at, updated_at)
        VALUES (:userId, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
        ON CONFLICT (id)
        DO UPDATE SET updated_at = EXCLUDED.updated_at
      `,
      [stringParam('userId', userId), stringParam('createdAt', timestamp), stringParam('updatedAt', timestamp)],
      transactionId
    );
  }

  private async touchDay(userId: string, date: string, timestamp: string, transactionId?: string) {
    const existing = await this.getDay(userId, date);
    await this.dataApiClient.execute(
      `
        INSERT INTO journal_days (user_id, date, daily_summary, created_at, updated_at)
        VALUES (:userId, CAST(:date AS DATE), :dailySummary, CAST(:createdAt AS TIMESTAMPTZ), CAST(:updatedAt AS TIMESTAMPTZ))
        ON CONFLICT (user_id, date)
        DO UPDATE SET updated_at = EXCLUDED.updated_at
      `,
      [
        stringParam('userId', userId),
        stringParam('date', date),
        stringParam('dailySummary', existing?.dailySummary ?? ''),
        stringParam('createdAt', existing?.createdAt ?? timestamp),
        stringParam('updatedAt', timestamp),
      ],
      transactionId
    );
  }

  private async insertCard(userId: string, date: string, card: Card, sortOrder: number, transactionId?: string) {
    await this.dataApiClient.execute(
      `
        INSERT INTO journal_cards (
          id,
          user_id,
          date,
          sort_order,
          fact,
          thought,
          emotion,
          body_sensation,
          created_at,
          updated_at
        )
        VALUES (
          CAST(:id AS UUID),
          :userId,
          CAST(:date AS DATE),
          :sortOrder,
          :fact,
          :thought,
          :emotion,
          :bodySensation,
          CAST(:createdAt AS TIMESTAMPTZ),
          CAST(:updatedAt AS TIMESTAMPTZ)
        )
      `,
      [
        stringParam('id', card.id),
        stringParam('userId', userId),
        stringParam('date', date),
        numberParam('sortOrder', sortOrder),
        stringParam('fact', card.fact),
        stringParam('thought', card.thought),
        stringParam('emotion', card.emotion),
        stringParam('bodySensation', card.bodySensation),
        stringParam('createdAt', card.createdAt),
        stringParam('updatedAt', card.updatedAt),
      ],
      transactionId
    );
  }

  private async getCard(userId: string, date: string, cardId: string) {
    const rows = await this.dataApiClient.query<Card>(
      `
        SELECT
          id,
          fact,
          thought,
          emotion,
          body_sensation AS "bodySensation",
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
        FROM journal_cards
        WHERE user_id = :userId
          AND date = CAST(:date AS DATE)
          AND id = CAST(:cardId AS UUID)
      `,
      [stringParam('userId', userId), stringParam('date', date), stringParam('cardId', cardId)]
    );

    return rows[0] ?? null;
  }

  private async getDaysForUser(userId: string) {
    const rows = await this.dataApiClient.query<DayWithCardsRow>(
      `${daySelectSql} ORDER BY d.date, c.sort_order, c.created_at, c.id`,
      [stringParam('userId', userId)]
    );
    return mapDayRows(rows);
  }

  private async getDaysByDateRange(userId: string, startDate: string, endDate: string) {
    const rows = await this.dataApiClient.query<DayWithCardsRow>(
      `${daySelectSql} AND d.date BETWEEN CAST(:startDate AS DATE) AND CAST(:endDate AS DATE) ORDER BY d.date, c.sort_order, c.created_at, c.id`,
      [stringParam('userId', userId), stringParam('startDate', startDate), stringParam('endDate', endDate)]
    );
    return mapDayRows(rows);
  }

  private async getWeeklySummaryRow(userId: string, weekKey: string) {
    const rows = await this.dataApiClient.query<SummaryRow>(
      `
        SELECT
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM weekly_summaries
        WHERE user_id = :userId AND week_key = CAST(:weekKey AS DATE)
      `,
      [stringParam('userId', userId), stringParam('weekKey', weekKey)]
    );
    return rows[0];
  }

  private async getMonthlySummaryRow(userId: string, monthKey: string) {
    const rows = await this.dataApiClient.query<SummaryRow>(
      `
        SELECT
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM monthly_summaries
        WHERE user_id = :userId AND month_key = :monthKey
      `,
      [stringParam('userId', userId), stringParam('monthKey', monthKey)]
    );
    return rows[0];
  }

  private async getYearlySummaryRow(userId: string, yearKey: string) {
    const rows = await this.dataApiClient.query<SummaryRow>(
      `
        SELECT
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM yearly_summaries
        WHERE user_id = :userId AND year_key = :yearKey
      `,
      [stringParam('userId', userId), stringParam('yearKey', yearKey)]
    );
    return rows[0];
  }

  private async getWeeklySummaries(userId: string, prefix?: string) {
    const rows = await this.dataApiClient.query<SummaryRow & { week_key: string }>(
      `
        SELECT
          week_key,
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM weekly_summaries
        WHERE user_id = :userId
          ${prefix ? `AND week_key LIKE :prefix` : ''}
        ORDER BY week_key
      `,
      prefix
        ? [stringParam('userId', userId), stringParam('prefix', `${prefix}%`)]
        : [stringParam('userId', userId)]
    );

    return rows.map((row) => mapWeeklySummary(row.week_key, row)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  private async getMonthlySummaries(userId: string, prefix?: string) {
    const rows = await this.dataApiClient.query<SummaryRow & { month_key: string }>(
      `
        SELECT
          month_key,
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM monthly_summaries
        WHERE user_id = :userId
          ${prefix ? `AND month_key LIKE :prefix` : ''}
        ORDER BY month_key
      `,
      prefix
        ? [stringParam('userId', userId), stringParam('prefix', `${prefix}%`)]
        : [stringParam('userId', userId)]
    );

    return rows.map((row) => mapMonthlySummary(row.month_key, row)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  private async getYearlySummaries(userId: string) {
    const rows = await this.dataApiClient.query<SummaryRow & { year_key: string }>(
      `
        SELECT
          year_key,
          summary,
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS updated_at
        FROM yearly_summaries
        WHERE user_id = :userId
        ORDER BY year_key
      `,
      [stringParam('userId', userId)]
    );

    return rows.map((row) => mapYearlySummary(row.year_key, row)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  }
}
