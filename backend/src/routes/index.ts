import {
  assertCardId,
  assertDateString,
  assertMonthKey,
  assertWeekKey,
  assertYearKey,
  type ImportLocalStorageSnapshotRequest,
  type PostCardRequest,
  type PutCardRequest,
  type PutDayRequest,
  type PutDaySummaryRequest,
  type PutMonthSummaryRequest,
  type PutWeekSummaryRequest,
  type PutYearSummaryRequest,
} from '../../../src/contracts/journalApi';
import { getCurrentUser } from '../auth/getCurrentUser';
import { methodNotAllowedError, notFoundError, validationError } from '../libs/errors';
import { noContent, success } from '../libs/response';
import type { JournalService } from '../services/journalService';
import type { ApiGatewayHttpEvent, ApiGatewayHttpResponse } from '../functions/api/types';

type RouteDependencies = {
  journalService: JournalService;
};

const parseJsonBody = <T>(event: ApiGatewayHttpEvent): T => {
  if (!event.body) {
    return {} as T;
  }

  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body;
    return JSON.parse(body) as T;
  } catch {
    throw validationError('INVALID_REQUEST_BODY', 'Request body must be valid JSON');
  }
};

const validateDate = (value: string) => {
  try {
    assertDateString(value);
  } catch {
    throw validationError('INVALID_DATE', 'Invalid date: expected YYYY-MM-DD', { date: value });
  }
};

const validateWeekKey = (value: string) => {
  try {
    assertWeekKey(value);
  } catch {
    throw validationError('INVALID_WEEK_KEY', 'Invalid weekKey: expected YYYY-MM-DD', { weekKey: value });
  }
};

const validateMonthKey = (value: string) => {
  try {
    assertMonthKey(value);
  } catch {
    throw validationError('INVALID_MONTH_KEY', 'Invalid monthKey: expected YYYY-MM', { monthKey: value });
  }
};

const validateYearKey = (value: string) => {
  try {
    assertYearKey(value);
  } catch {
    throw validationError('INVALID_YEAR_KEY', 'Invalid yearKey: expected YYYY', { yearKey: value });
  }
};

const validateCardId = (value: string) => {
  try {
    assertCardId(value);
  } catch {
    throw validationError('INVALID_CARD_ID', 'Invalid cardId: expected non-empty string', { cardId: value });
  }
};

const assertSummaryBody = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw validationError('INVALID_REQUEST_BODY', 'summary must be a string');
  }

  return value;
};

export const routeRequest = async (
  event: ApiGatewayHttpEvent,
  dependencies: RouteDependencies
): Promise<ApiGatewayHttpResponse> => {
  const requestId = event.requestContext.requestId;
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  if (method === 'OPTIONS') {
    return noContent();
  }

  if (path === '/health') {
    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(
      {
        status: 'ok',
        service: 'reflect-journal-backend',
      },
      requestId
    );
  }

  const { userId } = getCurrentUser(event);

  if (path === '/migration/local-storage-import') {
    if (method !== 'POST') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<ImportLocalStorageSnapshotRequest>(event);
    return success(await dependencies.journalService.importSnapshot(userId, payload.snapshot), requestId);
  }

  const dayCardMatch = path.match(/^\/days\/([^/]+)\/cards\/([^/]+)$/);
  if (dayCardMatch) {
    const [, date, cardId] = dayCardMatch;
    validateDate(date);
    validateCardId(cardId);

    if (method === 'PUT') {
      const payload = parseJsonBody<PutCardRequest>(event);
      return success(await dependencies.journalService.updateCard(userId, date, cardId, payload), requestId);
    }

    if (method === 'DELETE') {
      await dependencies.journalService.deleteCard(userId, date, cardId);
      return success({ deleted: true }, requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  const dayCardsMatch = path.match(/^\/days\/([^/]+)\/cards$/);
  if (dayCardsMatch) {
    const [, date] = dayCardsMatch;
    validateDate(date);

    if (method !== 'POST') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PostCardRequest>(event);
    return success(await dependencies.journalService.createCard(userId, date, payload), requestId);
  }

  const daySummaryMatch = path.match(/^\/days\/([^/]+)\/summary$/);
  if (daySummaryMatch) {
    const [, date] = daySummaryMatch;
    validateDate(date);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutDaySummaryRequest>(event);
    return success(await dependencies.journalService.saveDailySummary(userId, date, assertSummaryBody(payload.dailySummary)), requestId);
  }

  const dayMatch = path.match(/^\/days\/([^/]+)$/);
  if (dayMatch) {
    const [, date] = dayMatch;
    validateDate(date);

    if (method === 'GET') {
      return success(await dependencies.journalService.getDay(userId, date), requestId);
    }

    if (method === 'PUT') {
      const payload = parseJsonBody<PutDayRequest>(event);
      return success(await dependencies.journalService.saveDay(userId, date, payload), requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  const weekSummaryMatch = path.match(/^\/weeks\/([^/]+)\/summary$/);
  if (weekSummaryMatch) {
    const [, weekKey] = weekSummaryMatch;
    validateWeekKey(weekKey);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutWeekSummaryRequest>(event);
    return success(await dependencies.journalService.saveWeekSummary(userId, weekKey, assertSummaryBody(payload.summary)), requestId);
  }

  const weekMatch = path.match(/^\/weeks\/([^/]+)$/);
  if (weekMatch) {
    const [, weekKey] = weekMatch;
    validateWeekKey(weekKey);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getWeek(userId, weekKey), requestId);
  }

  const monthSummaryMatch = path.match(/^\/months\/([^/]+)\/summary$/);
  if (monthSummaryMatch) {
    const [, monthKey] = monthSummaryMatch;
    validateMonthKey(monthKey);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutMonthSummaryRequest>(event);
    return success(await dependencies.journalService.saveMonthSummary(userId, monthKey, assertSummaryBody(payload.summary)), requestId);
  }

  const monthMatch = path.match(/^\/months\/([^/]+)$/);
  if (monthMatch) {
    const [, monthKey] = monthMatch;
    validateMonthKey(monthKey);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getMonth(userId, monthKey), requestId);
  }

  const yearSummaryMatch = path.match(/^\/years\/([^/]+)\/summary$/);
  if (yearSummaryMatch) {
    const [, yearKey] = yearSummaryMatch;
    validateYearKey(yearKey);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutYearSummaryRequest>(event);
    return success(await dependencies.journalService.saveYearSummary(userId, yearKey, assertSummaryBody(payload.summary)), requestId);
  }

  const yearMatch = path.match(/^\/years\/([^/]+)$/);
  if (yearMatch) {
    const [, yearKey] = yearMatch;
    validateYearKey(yearKey);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getYear(userId, yearKey), requestId);
  }

  throw notFoundError('Route not found', { path });
};
