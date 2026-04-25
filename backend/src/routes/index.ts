import {
  assertCardId,
  assertDateString,
  assertMonthKey,
  assertWeekKey,
} from '../../../src/contracts/journalApi';
import {
  assertTodoDate,
  assertTodoLabelId,
  assertTodoTaskId,
  type PostTodoLabelRequest,
  type PostTodoReorderRequest,
  type PostTodoTaskRequest,
  type PutTodoLabelRequest,
  type PutTodoTaskRequest,
} from '../../../src/contracts/todoApi';
import type {
  PostThinkingMemoCardRequest,
  PutThinkingMemoCardRequest,
  PutThinkingReflectionRequest,
  PutThinkingQuestionResponsesRequest,
  PutWeeklyReflectionRequest,
  PutWeeklyUserNoteRequest,
} from '../../../src/contracts/thinkingReflectionApi';
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

const validateThinkingMonthKey = validateMonthKey;

const validateCardId = (value: string) => {
  try {
    assertCardId(value);
  } catch {
    throw validationError('INVALID_CARD_ID', 'Invalid cardId: expected non-empty string', { cardId: value });
  }
};

const validateTodoDate = (value: string, field: 'from' | 'to') => {
  try {
    assertTodoDate(value);
  } catch {
    throw validationError('INVALID_DATE', `Invalid ${field}: expected YYYY-MM-DD`, { [field]: value });
  }
};

const validateTodoTaskId = (value: string) => {
  try {
    assertTodoTaskId(value);
  } catch {
    throw validationError('INVALID_REQUEST_BODY', 'Invalid taskId: expected non-empty string', { taskId: value });
  }
};

const validateTodoLabelId = (value: string) => {
  try {
    assertTodoLabelId(value);
  } catch {
    throw validationError('INVALID_REQUEST_BODY', 'Invalid labelId: expected non-empty string', { labelId: value });
  }
};

const parseQuery = (event: ApiGatewayHttpEvent) => new URLSearchParams(event.rawQueryString ?? '');

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
        service: 'reflect-journal-dynamo-backend',
      },
      requestId
    );
  }

  const { userId } = getCurrentUser(event);

  if (path === '/todos') {
    if (method === 'GET') {
      const query = parseQuery(event);
      const from = query.get('from');
      const to = query.get('to');
      if (!from || !to) {
        throw validationError('INVALID_REQUEST_BODY', 'from and to query params are required');
      }
      validateTodoDate(from, 'from');
      validateTodoDate(to, 'to');
      return success(await dependencies.journalService.getTodoSnapshot(userId, from, to), requestId);
    }

    if (method === 'POST') {
      const payload = parseJsonBody<PostTodoTaskRequest>(event);
      return success(await dependencies.journalService.createTodoTask(userId, payload), requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  if (path === '/todos/reorder') {
    if (method !== 'POST') {
      throw methodNotAllowedError(method, path);
    }
    const payload = parseJsonBody<PostTodoReorderRequest>(event);
    await dependencies.journalService.reorderTodoTasks(userId, payload.taskIds ?? []);
    return success({ reordered: true }, requestId);
  }

  const todoTaskMatch = path.match(/^\/todos\/([^/]+)$/);
  if (todoTaskMatch) {
    const [, taskId] = todoTaskMatch;
    validateTodoTaskId(taskId);

    if (method === 'PUT') {
      const payload = parseJsonBody<PutTodoTaskRequest>(event);
      return success(await dependencies.journalService.updateTodoTask(userId, taskId, payload), requestId);
    }

    if (method === 'DELETE') {
      await dependencies.journalService.deleteTodoTask(userId, taskId);
      return success({ deleted: true }, requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  if (path === '/todo-labels') {
    if (method !== 'POST') {
      throw methodNotAllowedError(method, path);
    }
    const payload = parseJsonBody<PostTodoLabelRequest>(event);
    return success(await dependencies.journalService.createTodoLabel(userId, payload), requestId);
  }

  const todoLabelMatch = path.match(/^\/todo-labels\/([^/]+)$/);
  if (todoLabelMatch) {
    const [, labelId] = todoLabelMatch;
    validateTodoLabelId(labelId);

    if (method === 'PUT') {
      const payload = parseJsonBody<PutTodoLabelRequest>(event);
      return success(await dependencies.journalService.updateTodoLabel(userId, labelId, payload), requestId);
    }

    if (method === 'DELETE') {
      await dependencies.journalService.deleteTodoLabel(userId, labelId);
      return success({ deleted: true }, requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  const thinkingMemoCardMatch = path.match(/^\/v2\/days\/([^/]+)\/memo-cards\/([^/]+)$/);
  if (thinkingMemoCardMatch) {
    const [, date, memoCardId] = thinkingMemoCardMatch;
    validateDate(date);
    validateCardId(memoCardId);

    if (method === 'DELETE') {
      await dependencies.journalService.deleteThinkingMemoCard(userId, date, memoCardId);
      return success({ deleted: true }, requestId);
    }

    if (method === 'PUT') {
      const payload = parseJsonBody<PutThinkingMemoCardRequest>(event);
      return success(await dependencies.journalService.updateThinkingMemoCard(userId, date, memoCardId, payload), requestId);
    }

    throw methodNotAllowedError(method, path);
  }

  const thinkingMemoCardsMatch = path.match(/^\/v2\/days\/([^/]+)\/memo-cards$/);
  if (thinkingMemoCardsMatch) {
    const [, date] = thinkingMemoCardsMatch;
    validateDate(date);

    if (method !== 'POST') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PostThinkingMemoCardRequest>(event);
    return success(await dependencies.journalService.createThinkingMemoCard(userId, date, payload), requestId);
  }

  const thinkingReflectionMatch = path.match(/^\/v2\/days\/([^/]+)\/thinking-reflection$/);
  if (thinkingReflectionMatch) {
    const [, date] = thinkingReflectionMatch;
    validateDate(date);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutThinkingReflectionRequest>(event);
    return success(await dependencies.journalService.saveThinkingReflection(userId, date, payload.reflection), requestId);
  }

  const thinkingQuestionResponsesMatch = path.match(/^\/v2\/days\/([^/]+)\/question-responses$/);
  if (thinkingQuestionResponsesMatch) {
    const [, date] = thinkingQuestionResponsesMatch;
    validateDate(date);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutThinkingQuestionResponsesRequest>(event);
    return success(await dependencies.journalService.saveThinkingQuestionResponses(userId, date, payload.questionResponses), requestId);
  }

  const thinkingDayMatch = path.match(/^\/v2\/days\/([^/]+)$/);
  if (thinkingDayMatch) {
    const [, date] = thinkingDayMatch;
    validateDate(date);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getThinkingDay(userId, date), requestId);
  }

  const thinkingMonthMatch = path.match(/^\/v2\/months\/([^/]+)$/);
  if (thinkingMonthMatch) {
    const [, monthKey] = thinkingMonthMatch;
    validateThinkingMonthKey(monthKey);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getThinkingMonth(userId, monthKey), requestId);
  }

  const thinkingWeekReflectionMatch = path.match(/^\/v2\/weeks\/([^/]+)\/reflection$/);
  if (thinkingWeekReflectionMatch) {
    const [, weekStart] = thinkingWeekReflectionMatch;
    validateWeekKey(weekStart);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutWeeklyReflectionRequest>(event);
    return success(await dependencies.journalService.saveWeeklyReflection(userId, weekStart, payload.reflection), requestId);
  }

  const thinkingWeekUserNoteMatch = path.match(/^\/v2\/weeks\/([^/]+)\/note$/);
  if (thinkingWeekUserNoteMatch) {
    const [, weekStart] = thinkingWeekUserNoteMatch;
    validateWeekKey(weekStart);

    if (method !== 'PUT') {
      throw methodNotAllowedError(method, path);
    }

    const payload = parseJsonBody<PutWeeklyUserNoteRequest>(event);
    return success(await dependencies.journalService.saveWeeklyUserNote(userId, weekStart, payload.userNote), requestId);
  }

  const thinkingWeekMatch = path.match(/^\/v2\/weeks\/([^/]+)$/);
  if (thinkingWeekMatch) {
    const [, weekStart] = thinkingWeekMatch;
    validateWeekKey(weekStart);

    if (method !== 'GET') {
      throw methodNotAllowedError(method, path);
    }

    return success(await dependencies.journalService.getThinkingWeek(userId, weekStart), requestId);
  }

  throw notFoundError('Route not found', { path });
};
