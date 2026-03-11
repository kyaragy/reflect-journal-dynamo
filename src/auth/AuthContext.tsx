import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthSession } from './authSession';

export type AuthUser = {
  userId: string;
  accessToken?: string;
};

type AuthContextValue = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthSession({
      userId: currentUser?.userId ?? null,
      accessToken: currentUser?.accessToken ?? null,
    });
  }, [currentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      login: () =>
        setCurrentUser({
          userId: 'mock-user',
          accessToken: 'mock-jwt-token',
        }),
      logout: () => setCurrentUser(null),
    }),
    [currentUser]
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
