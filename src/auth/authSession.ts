export type AuthSession = {
  userId: string | null;
  accessToken: string | null;
};

let currentSession: AuthSession = {
  userId: null,
  accessToken: null,
};

export const getAuthSession = () => currentSession;

export const setAuthSession = (session: AuthSession) => {
  currentSession = session;
};
