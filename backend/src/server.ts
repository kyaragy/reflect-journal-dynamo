import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import {
  assertCardId,
  assertDateString,
  assertMonthKey,
  assertWeekKey,
  journalApiPaths,
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type DeleteCardResponse,
  type GetDayResponse,
  type GetMonthResponse,
  type GetWeekResponse,
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
} from '../../src/contracts/journalApi';
import type { Card, Day, MonthRecord, WeeklySummary, MonthlySummary } from '../../src/domain/journal';

type AuthContext = {
  userId: string;
  accessToken?: string;
};

type MemoryStore = {
  days: Map<string, Day>;
  weeklySummaries: Map<string, WeeklySummary>;
  monthlySummaries: Map<string, MonthlySummary>;
};

const PORT = Number(process.env.PORT ?? 4000);

const store: MemoryStore = {
  days: new Map(),
  weeklySummaries: new Map(),
  monthlySummaries: new Map(),
};

const sendJson = <T>(
  res: ServerResponse,
  status: number,
  body: ApiSuccessResponse<T> | ApiErrorResponse
) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
};

const sendNoContent = (res: ServerResponse) => {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end();
};

const readJsonBody = async <T>(req: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T;
};

const resolveAuthContext = (req: IncomingMessage): AuthContext => {
  const header = req.headers.authorization;
  const accessToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  // Placeholder for future Cognito JWT verification.
  return {
    userId: accessToken ? 'jwt-user' : 'mock-user',
    accessToken,
  };
};

const now = () => new Date().toISOString();

const withAuthDay = (day: Day, userId: string): Day => ({
  ...day,
  userId: day.userId ?? userId,
});

const getMonthDays = (monthKey: string) =>
  Array.from(store.days.values()).filter((day) => day.date.startsWith(monthKey));

const getWeekDays = (weekKey: string) => {
  const start = new Date(`${weekKey}T00:00:00Z`);
  const keys = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    return current.toISOString().slice(0, 10);
  });

  return keys
    .map((key) => store.days.get(key))
    .filter((day): day is Day => Boolean(day));
};

const createError = (code: ApiErrorResponse['error']['code'], message: string): ApiErrorResponse => ({
  error: { code, message },
});

const createCard = (payload: PostCardRequest): Card => {
  const timestamp = now();
  return {
    id: randomUUID(),
    fact: payload.fact ?? '',
    thought: payload.thought ?? '',
    emotion: payload.emotion ?? '',
    bodySensation: payload.bodySensation ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const routeDay = async (
  req: IncomingMessage,
  res: ServerResponse,
  date: string,
  auth: AuthContext
) => {
  assertDateString(date);

  if (req.method === 'GET') {
    const response: GetDayResponse = {
      data: store.days.get(date) ?? null,
    };
    sendJson(res, 200, response);
    return;
  }

  if (req.method === 'PUT') {
    const payload = await readJsonBody<PutDayRequest>(req);
    const nextDay: Day = withAuthDay(
      {
        ...payload,
        date,
      },
      auth.userId
    );
    store.days.set(date, nextDay);
    const response: PutDayResponse = { data: nextDay };
    sendJson(res, 200, response);
    return;
  }

  sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
};

const routeDaySummary = async (req: IncomingMessage, res: ServerResponse, date: string, auth: AuthContext) => {
  assertDateString(date);

  if (req.method !== 'PUT') {
    sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
    return;
  }

  const payload = await readJsonBody<PutDaySummaryRequest>(req);
  const existing = store.days.get(date);
  const timestamp = now();
  const nextDay: Day = withAuthDay(
    existing ?? {
      date,
      cards: [],
      dailySummary: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    auth.userId
  );

  nextDay.dailySummary = payload.dailySummary;
  nextDay.updatedAt = timestamp;
  store.days.set(date, nextDay);

  const response: PutDaySummaryResponse = { data: nextDay };
  sendJson(res, 200, response);
};

const routeDayCards = async (req: IncomingMessage, res: ServerResponse, date: string, auth: AuthContext) => {
  assertDateString(date);
  const existing = store.days.get(date);
  const timestamp = now();
  const day =
    existing ??
    withAuthDay(
      {
        date,
        cards: [],
        dailySummary: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      auth.userId
    );

  if (req.method === 'POST') {
    const payload = await readJsonBody<PostCardRequest>(req);
    const card = createCard(payload);
    day.cards = [...day.cards, card];
    day.updatedAt = now();
    store.days.set(date, day);

    const response: PostCardResponse = { data: card };
    sendJson(res, 200, response);
    return;
  }

  sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
};

const routeDayCard = async (
  req: IncomingMessage,
  res: ServerResponse,
  date: string,
  cardId: string
) => {
  assertDateString(date);
  assertCardId(cardId);

  const day = store.days.get(date);
  if (!day) {
    sendJson(res, 404, createError('NOT_FOUND', 'Day not found'));
    return;
  }

  const cardIndex = day.cards.findIndex((card) => card.id === cardId);
  if (cardIndex === -1) {
    sendJson(res, 404, createError('NOT_FOUND', 'Card not found'));
    return;
  }

  if (req.method === 'PUT') {
    const payload = await readJsonBody<PutCardRequest>(req);
    const current = day.cards[cardIndex];
    const nextCard: Card = {
      ...current,
      ...payload,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: now(),
    };
    day.cards[cardIndex] = nextCard;
    day.updatedAt = now();
    store.days.set(date, day);

    const response: PutCardResponse = { data: nextCard };
    sendJson(res, 200, response);
    return;
  }

  if (req.method === 'DELETE') {
    day.cards = day.cards.filter((card) => card.id !== cardId);
    day.updatedAt = now();
    store.days.set(date, day);

    const response: DeleteCardResponse = { data: { deleted: true } };
    sendJson(res, 200, response);
    return;
  }

  sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
};

const routeWeek = async (req: IncomingMessage, res: ServerResponse, weekKey: string) => {
  assertWeekKey(weekKey);

  if (req.method !== 'GET') {
    sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
    return;
  }

  const response: GetWeekResponse = {
    data: {
      weekKey,
      summary: store.weeklySummaries.get(weekKey),
      days: getWeekDays(weekKey),
    },
  };
  sendJson(res, 200, response);
};

const routeWeekSummary = async (req: IncomingMessage, res: ServerResponse, weekKey: string, auth: AuthContext) => {
  assertWeekKey(weekKey);
  if (req.method !== 'PUT') {
    sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
    return;
  }

  const payload = await readJsonBody<PutWeekSummaryRequest>(req);
  const current = store.weeklySummaries.get(weekKey);
  const timestamp = now();
  const next: WeeklySummary = {
    userId: current?.userId ?? auth.userId,
    weekKey,
    summary: payload.summary,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  store.weeklySummaries.set(weekKey, next);

  const response: PutWeekSummaryResponse = {
    data: {
      weekKey,
      summary: next,
      days: getWeekDays(weekKey),
    },
  };
  sendJson(res, 200, response);
};

const routeMonth = async (req: IncomingMessage, res: ServerResponse, monthKey: string) => {
  assertMonthKey(monthKey);
  if (req.method !== 'GET') {
    sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
    return;
  }

  const response: GetMonthResponse = {
    data: {
      monthKey,
      summary: store.monthlySummaries.get(monthKey),
      weeklySummaries: Array.from(store.weeklySummaries.values()).filter((item) => item.weekKey.startsWith(monthKey)),
      days: getMonthDays(monthKey),
    } satisfies MonthRecord,
  };
  sendJson(res, 200, response);
};

const routeMonthSummary = async (req: IncomingMessage, res: ServerResponse, monthKey: string, auth: AuthContext) => {
  assertMonthKey(monthKey);
  if (req.method !== 'PUT') {
    sendJson(res, 405, createError('INTERNAL_SERVER_ERROR', 'Method not allowed'));
    return;
  }

  const payload = await readJsonBody<PutMonthSummaryRequest>(req);
  const current = store.monthlySummaries.get(monthKey);
  const timestamp = now();
  const next: MonthlySummary = {
    userId: current?.userId ?? auth.userId,
    monthKey,
    summary: payload.summary,
    createdAt: current?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  store.monthlySummaries.set(monthKey, next);

  const response: PutMonthSummaryResponse = {
    data: {
      monthKey,
      summary: next,
      weeklySummaries: Array.from(store.weeklySummaries.values()).filter((item) => item.weekKey.startsWith(monthKey)),
      days: getMonthDays(monthKey),
    },
  };
  sendJson(res, 200, response);
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendJson(res, 400, createError('INTERNAL_SERVER_ERROR', 'Invalid request'));
      return;
    }

    if (req.method === 'OPTIONS') {
      sendNoContent(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;
    const auth = resolveAuthContext(req);

    if (pathname === '/health' && req.method === 'GET') {
      sendJson(res, 200, {
        data: {
          status: 'ok',
          service: 'reflect-journal-backend',
        },
      });
      return;
    }

    const dayCardMatch = pathname.match(/^\/days\/([^/]+)\/cards\/([^/]+)$/);
    if (dayCardMatch) {
      await routeDayCard(req, res, dayCardMatch[1], dayCardMatch[2]);
      return;
    }

    const dayCardsMatch = pathname.match(/^\/days\/([^/]+)\/cards$/);
    if (dayCardsMatch) {
      await routeDayCards(req, res, dayCardsMatch[1], auth);
      return;
    }

    const daySummaryMatch = pathname.match(/^\/days\/([^/]+)\/summary$/);
    if (daySummaryMatch) {
      await routeDaySummary(req, res, daySummaryMatch[1], auth);
      return;
    }

    const dayMatch = pathname.match(/^\/days\/([^/]+)$/);
    if (dayMatch) {
      await routeDay(req, res, dayMatch[1], auth);
      return;
    }

    const weekSummaryMatch = pathname.match(/^\/weeks\/([^/]+)\/summary$/);
    if (weekSummaryMatch) {
      await routeWeekSummary(req, res, weekSummaryMatch[1], auth);
      return;
    }

    const weekMatch = pathname.match(/^\/weeks\/([^/]+)$/);
    if (weekMatch) {
      await routeWeek(req, res, weekMatch[1]);
      return;
    }

    const monthSummaryMatch = pathname.match(/^\/months\/([^/]+)\/summary$/);
    if (monthSummaryMatch) {
      await routeMonthSummary(req, res, monthSummaryMatch[1], auth);
      return;
    }

    const monthMatch = pathname.match(/^\/months\/([^/]+)$/);
    if (monthMatch) {
      await routeMonth(req, res, monthMatch[1]);
      return;
    }

    sendJson(res, 404, createError('NOT_FOUND', 'Route not found'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    sendJson(res, 400, createError('INTERNAL_SERVER_ERROR', message));
  }
});

server.listen(PORT, () => {
  const routes = [
    'GET /health',
    `GET ${journalApiPaths.day(':date')}`,
    `PUT ${journalApiPaths.day(':date')}`,
    `PUT ${journalApiPaths.daySummary(':date')}`,
    `POST ${journalApiPaths.dayCards(':date')}`,
    `PUT ${journalApiPaths.dayCard(':date', ':cardId')}`,
    `DELETE ${journalApiPaths.dayCard(':date', ':cardId')}`,
    `GET ${journalApiPaths.week(':weekKey')}`,
    `PUT ${journalApiPaths.weekSummary(':weekKey')}`,
    `GET ${journalApiPaths.month(':monthKey')}`,
    `PUT ${journalApiPaths.monthSummary(':monthKey')}`,
  ];

  console.log(`reflect-journal backend listening on http://localhost:${PORT}`);
  console.log(routes.join('\n'));
});
