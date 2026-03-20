/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthStatus from './components/AuthStatus';
import CalendarPage from './pages/CalendarPage';
import DayPage from './pages/DayPage';
import WeekPage from './pages/WeekPage';
import MonthPage from './pages/MonthPage';
import YearPage from './pages/YearPage';
import { useJournalStore } from './store/useJournalStore';

function AppShell() {
  const { isAuthenticated, isLoading: authLoading, isAuthEnabled, login } = useAuth();
  const initializeMonth = useJournalStore((state) => state.initializeMonth);
  const loading = useJournalStore((state) => state.loading);
  const error = useJournalStore((state) => state.error);
  const initialLoadStatus = useJournalStore((state) => state.initialLoadStatus);

  useEffect(() => {
    if (isAuthEnabled && !isAuthenticated) {
      return;
    }
    void initializeMonth(format(new Date(), 'yyyy-MM'));
  }, [initializeMonth, isAuthEnabled, isAuthenticated]);

  useEffect(() => {
    if (!isAuthEnabled || authLoading || isAuthenticated) {
      return;
    }

    void login();
  }, [authLoading, isAuthEnabled, isAuthenticated, login]);

  if (isAuthEnabled && authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <p className="text-sm text-stone-500">認証状態を確認しています...</p>
        </main>
      </div>
    );
  }

  if (isAuthEnabled && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <p className="text-sm text-stone-500">ログイン画面に移動しています...</p>
        </main>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
        <header className="sticky top-0 z-10 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
          <div className="relative max-w-3xl mx-auto px-4 h-14 flex items-center justify-center">
            <h1 className="font-serif text-xl font-medium tracking-wide text-stone-700">Inner Space</h1>
            <div className="absolute right-4">
              <AuthStatus />
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8">
          {loading && initialLoadStatus !== 'ready' ? <p className="text-sm text-stone-500">Loading journal...</p> : null}
          {error ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/day/:date" element={<DayPage />} />
            <Route path="/week/:weekStart" element={<WeekPage />} />
            <Route path="/month/:yearMonth" element={<MonthPage />} />
            <Route path="/year/:year" element={<YearPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
