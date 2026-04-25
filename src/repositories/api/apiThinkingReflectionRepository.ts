import {
  assertCardId,
  assertDateString,
} from '../../contracts/journalApi';
import {
  assertThinkingMonthKey,
  thinkingReflectionApiPaths,
  type DeleteThinkingMemoCardResponse,
  type GetThinkingDayResponse,
  type GetThinkingMonthResponse,
  type GetThinkingWeekResponse,
  type PutMonthlyReflectionRequest,
  type PutMonthlyReflectionResponse,
  type PutMonthlyUserNoteRequest,
  type PutMonthlyUserNoteResponse,
  type PostThinkingMemoCardRequest,
  type PostThinkingMemoCardResponse,
  type PutThinkingMemoCardRequest,
  type PutThinkingMemoCardResponse,
  type PutThinkingReflectionRequest,
  type PutThinkingReflectionResponse,
  type PutThinkingQuestionResponsesRequest,
  type PutThinkingQuestionResponsesResponse,
  type PutWeeklyReflectionRequest,
  type PutWeeklyReflectionResponse,
  type PutWeeklyUserNoteRequest,
  type PutWeeklyUserNoteResponse,
} from '../../contracts/thinkingReflectionApi';
import {
  normalizeThinkingDayRecord,
  normalizeThinkingMonthRecord,
  normalizeThinkingWeekRecord,
  type MonthlyReflectionResult,
  type MonthlyUserNote,
  type ThinkingReflectionResult,
  type UpdateThinkingMemoCardInput,
  type UpsertThinkingQuestionResponseInput,
  type WeeklyReflectionResult,
  type WeeklyUserNote,
} from '../../domain/thinkingReflection';
import { apiClient } from '../../lib/apiClient';
import type { ThinkingReflectionRepository } from '../thinkingReflectionRepository';

export const apiThinkingReflectionRepository: ThinkingReflectionRepository = {
  async getDay(date) {
    assertDateString(date);
    const response = await apiClient.get<GetThinkingDayResponse>(thinkingReflectionApiPaths.day(date));
    return response.data ? normalizeThinkingDayRecord(response.data) : null;
  },

  async getMonth(monthKey) {
    assertThinkingMonthKey(monthKey);
    const response = await apiClient.get<GetThinkingMonthResponse>(thinkingReflectionApiPaths.month(monthKey));
    return normalizeThinkingMonthRecord(response.data);
  },

  async getWeek(weekStart) {
    assertDateString(weekStart);
    const response = await apiClient.get<GetThinkingWeekResponse>(thinkingReflectionApiPaths.week(weekStart));
    return normalizeThinkingWeekRecord(response.data);
  },

  async createMemoCard(date, input) {
    assertDateString(date);
    const payload: PostThinkingMemoCardRequest = input;
    const response = await apiClient.post<PostThinkingMemoCardResponse>(thinkingReflectionApiPaths.dayMemoCards(date), payload);
    return normalizeThinkingDayRecord(response.data);
  },

  async updateMemoCard(date, memoCardId, input) {
    assertDateString(date);
    assertCardId(memoCardId);
    const payload: PutThinkingMemoCardRequest = input as UpdateThinkingMemoCardInput;
    const response = await apiClient.put<PutThinkingMemoCardResponse>(thinkingReflectionApiPaths.dayMemoCard(date, memoCardId), payload);
    return normalizeThinkingDayRecord(response.data);
  },

  async deleteMemoCard(date, memoCardId) {
    assertDateString(date);
    assertCardId(memoCardId);
    await apiClient.delete<DeleteThinkingMemoCardResponse>(thinkingReflectionApiPaths.dayMemoCard(date, memoCardId));
  },

  async saveThinkingReflection(date, reflection) {
    assertDateString(date);
    const payload: PutThinkingReflectionRequest = { reflection: reflection as ThinkingReflectionResult };
    const response = await apiClient.put<PutThinkingReflectionResponse>(thinkingReflectionApiPaths.dayThinkingReflection(date), payload);
    return normalizeThinkingDayRecord(response.data);
  },

  async saveQuestionResponses(date, questionResponses) {
    assertDateString(date);
    const payload: PutThinkingQuestionResponsesRequest = {
      questionResponses: questionResponses as UpsertThinkingQuestionResponseInput[],
    };
    const response = await apiClient.put<PutThinkingQuestionResponsesResponse>(thinkingReflectionApiPaths.dayQuestionResponses(date), payload);
    return normalizeThinkingDayRecord(response.data);
  },

  async saveWeeklyReflection(weekStart, reflection) {
    assertDateString(weekStart);
    const payload: PutWeeklyReflectionRequest = { reflection: reflection as WeeklyReflectionResult };
    const response = await apiClient.put<PutWeeklyReflectionResponse>(thinkingReflectionApiPaths.weekReflection(weekStart), payload);
    return normalizeThinkingWeekRecord(response.data);
  },

  async saveWeeklyUserNote(weekStart, userNote) {
    assertDateString(weekStart);
    const payload: PutWeeklyUserNoteRequest = { userNote: userNote as WeeklyUserNote };
    const response = await apiClient.put<PutWeeklyUserNoteResponse>(thinkingReflectionApiPaths.weekUserNote(weekStart), payload);
    return normalizeThinkingWeekRecord(response.data);
  },

  async saveMonthlyReflection(monthKey, reflection) {
    assertThinkingMonthKey(monthKey);
    const payload: PutMonthlyReflectionRequest = { reflection: reflection as MonthlyReflectionResult };
    const response = await apiClient.put<PutMonthlyReflectionResponse>(thinkingReflectionApiPaths.monthReflection(monthKey), payload);
    return normalizeThinkingMonthRecord(response.data);
  },

  async saveMonthlyUserNote(monthKey, userNote) {
    assertThinkingMonthKey(monthKey);
    const payload: PutMonthlyUserNoteRequest = { userNote: userNote as MonthlyUserNote };
    const response = await apiClient.put<PutMonthlyUserNoteResponse>(thinkingReflectionApiPaths.monthUserNote(monthKey), payload);
    return normalizeThinkingMonthRecord(response.data);
  },
};
