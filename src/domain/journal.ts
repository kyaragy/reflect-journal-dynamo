export type JournalEntry = {
  id: string;
  date: string;
  fact: string;
  thought: string;
  emotion: string;
  sensation: string;
  createdAt: number;
};

export type DailySummary = {
  date: string;
  summary: string;
  reflection: string;
};

export type DayRecord = {
  date: string;
  entries: JournalEntry[];
  summary?: DailySummary;
};

export type WeekRecord = {
  weekKey: string;
  reflection: string;
  days: DayRecord[];
};

export type MonthRecord = {
  monthKey: string;
  reflection: string;
  weekSummaries: Record<string, string>;
  days: DayRecord[];
};

export type YearRecord = {
  yearKey: string;
  reflection: string;
  monthSummaries: Record<string, string>;
};

export type JournalSnapshot = {
  entries: JournalEntry[];
  summaries: Record<string, DailySummary>;
  weeklyReflections: Record<string, string>;
  monthlyReflections: Record<string, string>;
  yearlyReflections: Record<string, string>;
};

export type CreateJournalCardInput = Omit<JournalEntry, 'id' | 'createdAt'>;
