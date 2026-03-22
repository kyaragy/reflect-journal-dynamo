import {
  assertCardId,
  assertDateString,
  assertMonthKey,
  assertWeekKey,
  assertYearKey,
  journalApiPaths,
  type DeleteCardResponse,
  type GetDayResponse,
  type GetMonthResponse,
  type GetWeekResponse,
  type GetYearResponse,
  type ImportLocalStorageSnapshotRequest,
  type ImportLocalStorageSnapshotResponse,
  type PostCardRequest,
  type PostCardResponse,
  type PutCardRequest,
  type PutCardResponse,
  type PutDayRequest,
  type PutDayResponse,
  type PutDaySummaryRequest,
  type PutDaySummaryResponse,
  type PutMonthSummaryRequest,
  type PutMonthSummaryResponse,
  type PutWeekSummaryRequest,
  type PutWeekSummaryResponse,
  type PutYearSummaryRequest,
  type PutYearSummaryResponse,
} from '../../contracts/journalApi';
import { apiClient } from '../../lib/apiClient';
import {
  normalizeCard,
  normalizeDay,
  normalizeSnapshot,
  type JournalSnapshot,
} from '../../domain/journal';
import type { JournalRepository } from '../journalRepository';

export const apiRepository: JournalRepository = {
  async getDay(date) {
    assertDateString(date);
    const response = await apiClient.get<GetDayResponse>(journalApiPaths.day(date));
    return response.data ? normalizeDay(response.data) : null;
  },

  async saveDay(day) {
    assertDateString(day.date);
    const payload: PutDayRequest = { ...day };
    const response = await apiClient.put<PutDayResponse>(journalApiPaths.day(day.date), payload);
    return response.data;
  },

  async getWeek(weekKey) {
    assertWeekKey(weekKey);
    const response = await apiClient.get<GetWeekResponse>(journalApiPaths.week(weekKey));
    return {
      ...response.data,
      days: response.data.days.map(normalizeDay),
    };
  },

  async saveWeekSummary(weekKey, summary) {
    assertWeekKey(weekKey);
    const payload: PutWeekSummaryRequest = { summary };
    const response = await apiClient.put<PutWeekSummaryResponse>(journalApiPaths.weekSummary(weekKey), payload);
    return {
      ...response.data,
      days: response.data.days.map(normalizeDay),
    };
  },

  async getMonth(monthKey) {
    assertMonthKey(monthKey);
    const response = await apiClient.get<GetMonthResponse>(journalApiPaths.month(monthKey));
    return {
      ...response.data,
      days: response.data.days.map(normalizeDay),
    };
  },

  async saveMonthSummary(monthKey, summary) {
    assertMonthKey(monthKey);
    const payload: PutMonthSummaryRequest = { summary };
    const response = await apiClient.put<PutMonthSummaryResponse>(journalApiPaths.monthSummary(monthKey), payload);
    return {
      ...response.data,
      days: response.data.days.map(normalizeDay),
    };
  },

  async getYear(yearKey) {
    assertYearKey(yearKey);
    const response = await apiClient.get<GetYearResponse>(journalApiPaths.year(yearKey));
    return response.data;
  },

  async saveYearSummary(yearKey, summary) {
    assertYearKey(yearKey);
    const payload: PutYearSummaryRequest = { summary };
    const response = await apiClient.put<PutYearSummaryResponse>(journalApiPaths.yearSummary(yearKey), payload);
    return response.data;
  },

  async createCard(date, card) {
    assertDateString(date);
    const payload: PostCardRequest = { ...card };
    const response = await apiClient.post<PostCardResponse>(journalApiPaths.dayCards(date), payload);
    return normalizeCard(response.data);
  },

  async updateCard(date, cardId, card) {
    assertDateString(date);
    assertCardId(cardId);
    const payload: PutCardRequest = { ...card };
    const response = await apiClient.put<PutCardResponse>(journalApiPaths.dayCard(date, cardId), payload);
    return response.data ? normalizeCard(response.data) : null;
  },

  async deleteCard(date, cardId) {
    assertDateString(date);
    assertCardId(cardId);
    await apiClient.delete<DeleteCardResponse>(journalApiPaths.dayCard(date, cardId));
  },

  async saveDailySummary(date, summary) {
    assertDateString(date);
    const payload: PutDaySummaryRequest = { dailySummary: summary };
    const response = await apiClient.put<PutDaySummaryResponse>(journalApiPaths.daySummary(date), payload);
    return normalizeDay(response.data);
  },

  async importSnapshot(snapshot: JournalSnapshot) {
    const payload: ImportLocalStorageSnapshotRequest = { snapshot };
    const response = await apiClient.post<ImportLocalStorageSnapshotResponse>(journalApiPaths.importLocalStorage(), payload);
    return normalizeSnapshot(response.data);
  },
};
