const AUTH_SESSION_STORAGE_KEY = 'reflect-journal-dynamo-auth-session';

export type AuthSession = {
  userId: string | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

const emptySession: AuthSession = {
  userId: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  expiresAt: null,
};

let currentSession: AuthSession = emptySession;

const isBrowser = typeof window !== 'undefined';

const parseStoredSession = (value: string | null): AuthSession => {
  if (!value) {
    return emptySession;
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>;
    return {
      userId: parsed.userId ?? null,
      accessToken: parsed.accessToken ?? null,
      idToken: parsed.idToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      expiresAt: parsed.expiresAt ?? null,
    };
  } catch {
    return emptySession;
  }
};

export const getAuthSession = () => currentSession;

export const setAuthSession = (session: AuthSession) => {
  currentSession = session;

  if (!isBrowser) {
    return;
  }

  if (!session.accessToken) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const loadStoredAuthSession = () => {
  if (!isBrowser) {
    return currentSession;
  }

  currentSession = parseStoredSession(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY));
  return currentSession;
};

export const clearAuthSession = () => {
  setAuthSession(emptySession);
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(normalized + padding);
};

type JwtPayload = {
  sub?: string;
  exp?: number;
};

export const decodeJwtPayload = (token: string): JwtPayload => {
  const [, payload = ''] = token.split('.');
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return {};
  }
};

export const isSessionActive = (session: AuthSession, now = Date.now()) =>
  Boolean(session.accessToken && session.expiresAt && session.expiresAt - 60_000 > now);
