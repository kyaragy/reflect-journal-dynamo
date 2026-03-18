import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  decodeJwtPayload,
  getAuthSession,
  isSessionActive,
  loadStoredAuthSession,
  setAuthSession,
  type AuthSession,
} from './authSession';

export type AuthUser = {
  userId: string;
  accessToken?: string;
};

type AuthContextValue = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthEnabled: boolean;
  login: () => Promise<void>;
  logout: () => void;
};

type TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STATE_STORAGE_KEY = 'reflect-journal-cognito-auth-state';
const PKCE_VERIFIER_STORAGE_KEY = 'reflect-journal-cognito-pkce-verifier';
const POST_LOGIN_HASH_STORAGE_KEY = 'reflect-journal-post-login-hash';
const REPOSITORY_DRIVER = import.meta.env.VITE_REPOSITORY_DRIVER ?? 'localStorage';
const IS_AUTH_ENABLED = REPOSITORY_DRIVER === 'api';
const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/\/$/, '');
const COGNITO_APP_CLIENT_ID = import.meta.env.VITE_COGNITO_APP_CLIENT_ID ?? '';

const isBrowser = typeof window !== 'undefined';

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

const buildRedirectUri = () => {
  if (!isBrowser) {
    return '';
  }
  return window.location.origin;
};

const toAuthUser = (session: AuthSession): AuthUser | null =>
  session.userId && session.accessToken
    ? {
        userId: session.userId,
        accessToken: session.accessToken,
      }
    : null;

const normalizeTokenResponse = (response: TokenResponse, fallbackRefreshToken: string | null = null): AuthSession => {
  const payload = decodeJwtPayload(response.id_token ?? response.access_token);
  return {
    userId: payload.sub ?? null,
    accessToken: response.access_token,
    idToken: response.id_token ?? null,
    refreshToken: response.refresh_token ?? fallbackRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
};

const exchangeToken = async (params: URLSearchParams) => {
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

const applySession = (session: AuthSession, setCurrentUser: (user: AuthUser | null) => void) => {
  setAuthSession(session);
  setCurrentUser(toAuthUser(session));
};

const clearCallbackUrl = () => {
  if (!isBrowser) {
    return;
  }

  const postLoginHash = window.sessionStorage.getItem(POST_LOGIN_HASH_STORAGE_KEY) ?? '#/calendar';
  window.sessionStorage.removeItem(POST_LOGIN_HASH_STORAGE_KEY);
  window.history.replaceState({}, document.title, `${window.location.pathname}${postLoginHash}`);
};

const restoreSession = async () => {
  const storedSession = loadStoredAuthSession();
  if (isSessionActive(storedSession)) {
    return storedSession;
  }

  if (!storedSession.refreshToken) {
    clearAuthSession();
    return null;
  }

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
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => toAuthUser(getAuthSession()));
  const [isLoading, setIsLoading] = useState(IS_AUTH_ENABLED);

  useEffect(() => {
    if (!IS_AUTH_ENABLED || !isBrowser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        const authError = url.searchParams.get('error');

        if (authError) {
          throw new Error(`Cognito sign-in failed: ${authError}`);
        }

        if (code) {
          const expectedState = window.sessionStorage.getItem(AUTH_STATE_STORAGE_KEY);
          const verifier = window.sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);

          if (!expectedState || expectedState !== returnedState || !verifier) {
            throw new Error('Cognito sign-in state verification failed');
          }

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
          if (!cancelled) {
            applySession(session, setCurrentUser);
            clearCallbackUrl();
          }

          window.sessionStorage.removeItem(AUTH_STATE_STORAGE_KEY);
          window.sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
          return;
        }

        const restored = await restoreSession();
        if (!cancelled) {
          applySession(restored ?? {
            userId: null,
            accessToken: null,
            idToken: null,
            refreshToken: null,
            expiresAt: null,
          }, setCurrentUser);
        }
      } catch (error) {
        clearAuthSession();
        if (!cancelled) {
          setCurrentUser(null);
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser?.accessToken),
      isLoading,
      isAuthEnabled: IS_AUTH_ENABLED,
      login: async () => {
        if (!IS_AUTH_ENABLED || !isBrowser) {
          return;
        }

        const state = randomString(32);
        const verifier = randomString(64);
        const challenge = await createCodeChallenge(verifier);

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
      },
      logout: () => {
        clearAuthSession();
        setCurrentUser(null);

        if (!IS_AUTH_ENABLED || !isBrowser) {
          return;
        }

        const logoutUrl = new URL(`${COGNITO_DOMAIN}/logout`);
        logoutUrl.searchParams.set('client_id', COGNITO_APP_CLIENT_ID);
        logoutUrl.searchParams.set('logout_uri', buildRedirectUri());
        window.location.assign(logoutUrl.toString());
      },
    }),
    [currentUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
