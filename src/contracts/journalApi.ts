import type {
  Card,
  CreateCardInput,
  Day,
  JournalSnapshot,
  MonthRecord,
  WeekRecord,
  YearRecord,
} from '../domain/journal';

export type ApiValidationErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_WEEK_KEY'
  | 'INVALID_MONTH_KEY'
  | 'INVALID_YEAR_KEY'
  | 'INVALID_CARD_ID'
  | 'INVALID_REQUEST_BODY';

export type ApiErrorCode =
  | ApiValidationErrorCode
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_SERVER_ERROR';

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string>;
  };
};

export type ApiSuccessResponse<T> = {
  data: T;
  meta?: {
    requestId?: string;
  };
};

export type HealthResponse = ApiSuccessResponse<{
  status: 'ok';
  service: 'reflect-journal-backend';
}>;

export type GetDayResponse = ApiSuccessResponse<Day | null>;
export type PutDayRequest = Day;
export type PutDayResponse = ApiSuccessResponse<Day>;
export type PutDaySummaryRequest = { dailySummary: string };
export type PutDaySummaryResponse = ApiSuccessResponse<Day>;

export type PostCardRequest = CreateCardInput;
export type PostCardResponse = ApiSuccessResponse<Card>;
export type PutCardRequest = Partial<CreateCardInput>;
export type PutCardResponse = ApiSuccessResponse<Card>;
export type DeleteCardResponse = ApiSuccessResponse<{ deleted: true }>;

export type GetWeekResponse = ApiSuccessResponse<WeekRecord>;
export type PutWeekSummaryRequest = { summary: string };
export type PutWeekSummaryResponse = GetWeekResponse;

export type GetMonthResponse = ApiSuccessResponse<MonthRecord>;
export type PutMonthSummaryRequest = { summary: string };
export type PutMonthSummaryResponse = GetMonthResponse;

export type GetYearResponse = ApiSuccessResponse<YearRecord>;
export type PutYearSummaryRequest = { summary: string };
export type PutYearSummaryResponse = GetYearResponse;

export type ImportLocalStorageSnapshotRequest = {
  snapshot: JournalSnapshot;
};

export type ImportLocalStorageSnapshotResponse = ApiSuccessResponse<JournalSnapshot>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const YEAR_PATTERN = /^\d{4}$/;

const isValidDate = (value: string) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const assertDateString = (date: string) => {
  if (!isValidDate(date)) {
    throw new Error('Invalid date: expected YYYY-MM-DD');
  }
};

export const assertWeekKey = (weekKey: string) => {
  if (!isValidDate(weekKey)) {
    throw new Error('Invalid weekKey: expected YYYY-MM-DD');
  }
};

export const assertMonthKey = (monthKey: string) => {
  if (!MONTH_PATTERN.test(monthKey)) {
    throw new Error('Invalid monthKey: expected YYYY-MM');
  }
};

export const assertYearKey = (yearKey: string) => {
  if (!YEAR_PATTERN.test(yearKey)) {
    throw new Error('Invalid yearKey: expected YYYY');
  }
};

export const assertCardId = (cardId: string) => {
  if (!cardId.trim()) {
    throw new Error('Invalid cardId: expected non-empty string');
  }
};

export const journalApiPaths = {
  health: () => '/health',
  day: (date: string) => `/days/${date}`,
  daySummary: (date: string) => `/days/${date}/summary`,
  dayCards: (date: string) => `/days/${date}/cards`,
  dayCard: (date: string, cardId: string) => `/days/${date}/cards/${cardId}`,
  week: (weekKey: string) => `/weeks/${weekKey}`,
  weekSummary: (weekKey: string) => `/weeks/${weekKey}/summary`,
  month: (monthKey: string) => `/months/${monthKey}`,
  monthSummary: (monthKey: string) => `/months/${monthKey}/summary`,
  year: (yearKey: string) => `/years/${yearKey}`,
  yearSummary: (yearKey: string) => `/years/${yearKey}/summary`,
  importLocalStorage: () => '/migration/local-storage-import',
} as const;
