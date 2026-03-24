import type {
  Card,
  CardStep,
  Day,
  JournalSnapshot,
  MonthlySummary,
  WeeklySummary,
  YearlySummary,
} from '../../../src/domain/journal';

export type DayWithCardsRow = {
  date: string;
  daily_summary: string | null;
  day_created_at: string;
  day_updated_at: string;
  card_id: string | null;
  fact: string | null;
  thought: string | null;
  emotion: string | null;
  body_sensation: string | null;
  card_created_at: string | null;
  card_updated_at: string | null;
};

export type SummaryRow = {
  summary: string;
  created_at: string;
  updated_at: string;
};

const toCard = (row: DayWithCardsRow): Card | null => {
  if (!row.card_id || !row.card_created_at || !row.card_updated_at) {
    return null;
  }

  const steps: CardStep[] = [];
  if (row.thought) {
    steps.push({
      id: `${row.card_id}-thought-1`,
      order: steps.length + 1,
      type: 'thought',
      content: row.thought,
    });
  }
  if (row.emotion) {
    steps.push({
      id: `${row.card_id}-emotion-1`,
      order: steps.length + 1,
      type: 'emotion',
      content: row.emotion,
    });
  }
  if (row.body_sensation) {
    steps.push({
      id: `${row.card_id}-body-1`,
      order: steps.length + 1,
      type: 'body',
      content: row.body_sensation,
    });
  }

  return {
    id: row.card_id,
    trigger: {
      type: 'external',
      content: row.fact ?? '',
    },
    steps,
    createdAt: row.card_created_at,
    updatedAt: row.card_updated_at,
  };
};

export const mapDayRows = (rows: DayWithCardsRow[]): Day[] => {
  const days = new Map<string, Day>();

  for (const row of rows) {
    const existing = days.get(row.date);
    const card = toCard(row);

    if (existing) {
      if (card) {
        existing.cards.push(card);
      }
      continue;
    }

    days.set(row.date, {
      date: row.date,
      dailySummary: row.daily_summary ?? '',
      createdAt: row.day_created_at,
      updatedAt: row.day_updated_at,
      cards: card ? [card] : [],
      activities: [],
    });
  }

  return Array.from(days.values()).sort((left, right) => left.date.localeCompare(right.date));
};

export const mapWeeklySummary = (weekKey: string, row?: SummaryRow): WeeklySummary | undefined => {
  if (!row) {
    return undefined;
  }

  return {
    weekKey,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapMonthlySummary = (monthKey: string, row?: SummaryRow): MonthlySummary | undefined => {
  if (!row) {
    return undefined;
  }

  return {
    monthKey,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const mapYearlySummary = (yearKey: string, row?: SummaryRow): YearlySummary | undefined => {
  if (!row) {
    return undefined;
  }

  return {
    yearKey,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toSnapshot = (input: {
  days: Day[];
  weeklySummaries: WeeklySummary[];
  monthlySummaries: MonthlySummary[];
  yearlySummaries: YearlySummary[];
}): JournalSnapshot => ({
  days: input.days.sort((left, right) => left.date.localeCompare(right.date)),
  weeklySummaries: input.weeklySummaries.sort((left, right) => left.weekKey.localeCompare(right.weekKey)),
  monthlySummaries: input.monthlySummaries.sort((left, right) => left.monthKey.localeCompare(right.monthKey)),
  yearlySummaries: input.yearlySummaries.sort((left, right) => left.yearKey.localeCompare(right.yearKey)),
});
