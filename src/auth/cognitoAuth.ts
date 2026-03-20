import {
  clearAuthSession,
  decodeJwtPayload,
  loadStoredAuthSession,
  isSessionActive,
  setAuthSession,
  type AuthSession,
} from './authSession';

type TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

const AUTH_STATE_STORAGE_KEY = 'reflect-journal-dynamo-cognito-auth-state';
const PKCE_VERIFIER_STORAGE_KEY = 'reflect-journal-dynamo-cognito-pkce-verifier';
const POST_LOGIN_HASH_STORAGE_KEY = 'reflect-journal-dynamo-post-login-hash';
const LOGIN_REDIRECT_IN_PROGRESS_STORAGE_KEY = 'reflect-journal-dynamo-login-redirect-in-progress';

const REPOSITORY_DRIVER = import.meta.env.VITE_REPOSITORY_DRIVER ?? 'localStorage';
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE ?? 'cognito';
export const IS_AUTH_ENABLED = REPOSITORY_DRIVER === 'api' && AUTH_MODE !== 'local';
export const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');
export const COGNITO_APP_CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID ?? '';

const isBrowser = typeof window !== 'undefined';

let refreshSessionPromise: Promise<AuthSession | null> | null = null;

const base64UrlEncode = (input: Uint8Array) =>
  btoa(String.fromCharCode(...input))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const randomString = (length: number) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => charset[value % charset.length]).join('');
};

const createCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
};

export const buildRedirectUri = () => {
  if (!isBrowser) {
    return '';
  }

  return window.location.origin;
};

export const normalizeTokenResponse = (
  response: TokenResponse,
  fallbackRefreshToken: string | null = null
): AuthSession => {
  const payload = decodeJwtPayload(response.id_token ?? response.access_token);
  return {
    userId: payload.sub ?? null,
    accessToken: response.access_token,
    idToken: response.id_token ?? null,
    refreshToken: response.refresh_token ?? fallbackRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
};

export const exchangeToken = async (params: URLSearchParams) => {
  const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange Cognito token: ${response.status} ${errorText}`);
  }

  return (await response.json()) as TokenResponse;
};

export const clearLoginRedirectState = () => {
  if (!isBrowser) {
    return;
  }

  window.sessionStorage.removeItem(LOGIN_REDIRECT_IN_PROGRESS_STORAGE_KEY);
};

export const redirectToLogin = async () => {
  if (!IS_AUTH_ENABLED || !isBrowser) {
    return;
  }

  if (window.sessionStorage.getItem(LOGIN_REDIRECT_IN_PROGRESS_STORAGE_KEY) === 'true') {
    return;
  }

  const state = randomString(32);
  const verifier = randomString(64);
  const challenge = await createCodeChallenge(verifier);

  window.sessionStorage.setItem(LOGIN_REDIRECT_IN_PROGRESS_STORAGE_KEY, 'true');
  window.sessionStorage.setItem(AUTH_STATE_STORAGE_KEY, state);
  window.sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier);
  window.sessionStorage.setItem(POST_LOGIN_HASH_STORAGE_KEY, window.location.hash || '#/calendar');

  const authorizeUrl = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
  authorizeUrl.searchParams.set('client_id', COGNITO_APP_CLIENT_ID);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid email');
  authorizeUrl.searchParams.set('redirect_uri', buildRedirectUri());
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('code_challenge', challenge);

  window.location.assign(authorizeUrl.toString());
};

export const completeLoginFromCallback = async (code: string, verifier: string) => {
  const tokenResponse = await exchangeToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO_APP_CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: buildRedirectUri(),
    })
  );

  const session = normalizeTokenResponse(tokenResponse);
  setAuthSession(session);
  clearLoginRedirectState();
  return session;
};

export const refreshAuthSession = async () => {
  if (!IS_AUTH_ENABLED) {
    return null;
  }

  const storedSession = loadStoredAuthSession();
  if (isSessionActive(storedSession)) {
    return storedSession;
  }

  if (!storedSession.refreshToken) {
    clearAuthSession();
    return null;
  }

  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  refreshSessionPromise = (async () => {
    try {
      const refreshed = await exchangeToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: COGNITO_APP_CLIENT_ID,
          refresh_token: storedSession.refreshToken,
        })
      );

      const nextSession = normalizeTokenResponse(refreshed, storedSession.refreshToken);
      setAuthSession(nextSession);
      return nextSession;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshSessionPromise = null;
    }
  })();

  return refreshSessionPromise;
};

export const getAuthStateStorageKey = () => AUTH_STATE_STORAGE_KEY;
export const getPkceVerifierStorageKey = () => PKCE_VERIFIER_STORAGE_KEY;
export const getPostLoginHashStorageKey = () => POST_LOGIN_HASH_STORAGE_KEY;
