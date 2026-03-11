export type Card = {
  id: string;
  fact: string;
  thought: string;
  emotion: string;
  bodySensation: string;
  createdAt: string;
  updatedAt: string;
};

export type Day = {
  date: string;
  userId?: string;
  cards: Card[];
  dailySummary: string;
  createdAt: string;
  updatedAt: string;
};

export type WeeklySummary = {
  userId?: string;
  weekKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthlySummary = {
  userId?: string;
  monthKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type YearlySummary = {
  userId?: string;
  yearKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type WeekRecord = {
  weekKey: string;
  summary?: WeeklySummary;
  days: Day[];
};

export type MonthRecord = {
  monthKey: string;
  summary?: MonthlySummary;
  weeklySummaries: WeeklySummary[];
  days: Day[];
};

export type YearRecord = {
  yearKey: string;
  summary?: YearlySummary;
  monthlySummaries: MonthlySummary[];
};

export type JournalSnapshot = {
  days: Day[];
  weeklySummaries: WeeklySummary[];
  monthlySummaries: MonthlySummary[];
  yearlySummaries: YearlySummary[];
};

export type CreateCardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;

export const createEmptyJournalSnapshot = (): JournalSnapshot => ({
  days: [],
  weeklySummaries: [],
  monthlySummaries: [],
  yearlySummaries: [],
});
