import type {
  CreateThinkingMemoCardInput,
  ThinkingDayRecord,
  ThinkingMonthRecord,
  ThinkingWeekRecord,
  ThinkingReflectionResult,
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

export type PostThinkingMemoCardRequest = CreateThinkingMemoCardInput;
export type PostThinkingMemoCardResponse = {
  data: ThinkingDayRecord;
  meta?: {
    requestId?: string;
  };
};

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

export type DeleteThinkingMemoCardResponse = {
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
  dayMemoCards: (date: string) => `/v2/days/${date}/memo-cards`,
  dayMemoCard: (date: string, memoCardId: string) => `/v2/days/${date}/memo-cards/${memoCardId}`,
  dayThinkingReflection: (date: string) => `/v2/days/${date}/thinking-reflection`,
  dayQuestionResponses: (date: string) => `/v2/days/${date}/question-responses`,
  weekReflection: (weekStart: string) => `/v2/weeks/${weekStart}/reflection`,
  weekUserNote: (weekStart: string) => `/v2/weeks/${weekStart}/note`,
} as const;

export const assertThinkingDateString = assertDateString;
export const assertThinkingMonthKey = assertMonthKey;
