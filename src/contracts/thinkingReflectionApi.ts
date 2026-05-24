import type {
  CreateThinkingEntryInput,
  ThinkingDayRecord,
  ThinkingMonthRecord,
  ThinkingWeekRecord,
  ThinkingReflectionResult,
  MonthlyReflectionResult,
  MonthlyUserNote,
  UpdateThinkingEntryInput,
  UpsertThinkingQuestionResponseInput,
  WeeklyReflectionResult,
  WeeklyUserNote,
} from '../domain/thinkingReflection';
import { assertDateString, assertMonthKey } from './journalApi';

export type GetThinkingDayResponse = {
  data: ThinkingDayRecord | null;
  meta?: {
    requestId?: string;
  };
};

export type GetThinkingMonthResponse = {
  data: ThinkingMonthRecord;
  meta?: {
    requestId?: string;
  };
};

export type GetThinkingWeekResponse = {
  data: ThinkingWeekRecord;
  meta?: {
    requestId?: string;
  };
};

export type PostThinkingEntryRequest = CreateThinkingEntryInput;
export type PostThinkingEntryResponse = {
  data: ThinkingDayRecord;
  meta?: {
    requestId?: string;
  };
};

export type PutThinkingEntryRequest = UpdateThinkingEntryInput;
export type PutThinkingEntryResponse = PostThinkingEntryResponse;

export type PutThinkingReflectionRequest = {
  reflection: ThinkingReflectionResult;
};

export type PutThinkingQuestionResponsesRequest = {
  questionResponses: UpsertThinkingQuestionResponseInput[];
};

export type PutThinkingReflectionResponse = {
  data: ThinkingDayRecord;
  meta?: {
    requestId?: string;
  };
};

export type PutThinkingQuestionResponsesResponse = PutThinkingReflectionResponse;

export type PutWeeklyReflectionRequest = {
  reflection: WeeklyReflectionResult;
};

export type PutWeeklyReflectionResponse = {
  data: ThinkingWeekRecord;
  meta?: {
    requestId?: string;
  };
};

export type PutWeeklyUserNoteRequest = {
  userNote: WeeklyUserNote;
};

export type PutWeeklyUserNoteResponse = PutWeeklyReflectionResponse;

export type PutMonthlyReflectionRequest = {
  reflection: MonthlyReflectionResult;
};

export type PutMonthlyReflectionResponse = {
  data: ThinkingMonthRecord;
  meta?: {
    requestId?: string;
  };
};

export type PutMonthlyUserNoteRequest = {
  userNote: MonthlyUserNote;
};

export type PutMonthlyUserNoteResponse = PutMonthlyReflectionResponse;

export type DeleteThinkingEntryResponse = {
  data: {
    deleted: true;
  };
  meta?: {
    requestId?: string;
  };
};

export const thinkingReflectionApiPaths = {
  day: (date: string) => `/v2/days/${date}`,
  month: (monthKey: string) => `/v2/months/${monthKey}`,
  week: (weekStart: string) => `/v2/weeks/${weekStart}`,
  dayEntries: (date: string) => `/v2/days/${date}/entries`,
  dayEntry: (date: string, entryId: string) => `/v2/days/${date}/entries/${entryId}`,
  dayThinkingReflection: (date: string) => `/v2/days/${date}/thinking-reflection`,
  dayQuestionResponses: (date: string) => `/v2/days/${date}/question-responses`,
  weekReflection: (weekStart: string) => `/v2/weeks/${weekStart}/reflection`,
  weekUserNote: (weekStart: string) => `/v2/weeks/${weekStart}/note`,
  monthReflection: (monthKey: string) => `/v2/months/${monthKey}/reflection`,
  monthUserNote: (monthKey: string) => `/v2/months/${monthKey}/note`,
} as const;

export const assertThinkingDateString = assertDateString;
export const assertThinkingMonthKey = assertMonthKey;
