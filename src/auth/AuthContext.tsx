import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  type AuthSession,
} from './authSession';
import {
  COGNITO_APP_CLIENT_ID,
  COGNITO_DOMAIN,
  IS_AUTH_ENABLED,
  buildRedirectUri,
  clearLoginRedirectState,
  completeLoginFromCallback,
  getAuthStateStorageKey,
  getPkceVerifierStorageKey,
  getPostLoginHashStorageKey,
  redirectToLogin,
  refreshAuthSession,
} from './cognitoAuth';

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

const AuthContext = createContext<AuthContextValue | null>(null);

const isBrowser = typeof window !== 'undefined';

const toAuthUser = (session: AuthSession): AuthUser | null =>
  session.userId && session.accessToken
    ? {
        userId: session.userId,
        accessToken: session.accessToken,
      }
    : null;

const applySession = (session: AuthSession, setCurrentUser: (user: AuthUser | null) => void) => {
  setAuthSession(session);
  setCurrentUser(toAuthUser(session));
};

const clearCallbackUrl = () => {
  if (!isBrowser) {
    return;
  }

  const postLoginHash = window.sessionStorage.getItem(getPostLoginHashStorageKey()) ?? '#/v2/calendar';
  window.sessionStorage.removeItem(getPostLoginHashStorageKey());
  window.history.replaceState({}, document.title, `${window.location.pathname}${postLoginHash}`);
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
          const expectedState = window.sessionStorage.getItem(getAuthStateStorageKey());
          const verifier = window.sessionStorage.getItem(getPkceVerifierStorageKey());

          if (!expectedState || expectedState !== returnedState || !verifier) {
            throw new Error('Cognito sign-in state verification failed');
          }

          const session = await completeLoginFromCallback(code, verifier);
          if (!cancelled) {
            applySession(session, setCurrentUser);
            clearCallbackUrl();
          }

          window.sessionStorage.removeItem(getAuthStateStorageKey());
          window.sessionStorage.removeItem(getPkceVerifierStorageKey());
          return;
        }

        clearLoginRedirectState();
        const restored = await refreshAuthSession();
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
      login: redirectToLogin,
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
