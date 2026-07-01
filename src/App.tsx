/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthStatus from './components/AuthStatus';
import AppVersionSwitcher from './components/AppVersionSwitcher';
import EntryPage from './pages/EntryPage';
import TodoPage from './pages/TodoPage';
import { useThinkingReflectionStore } from './store/useThinkingReflectionStore';
import V2CalendarPage from './pages/V2CalendarPage';
import V2DayPage from './pages/V2DayPage';
import V2ThinkingReflectionPage from './pages/V2ThinkingReflectionPage';
import V2ThinkingWeekPage from './pages/V2ThinkingWeekPage';
import V2ThinkingMonthPage from './pages/V2ThinkingMonthPage';
import V2HomePage from './pages/V2HomePage';
import V2TimelinePage from './pages/V2TimelinePage';
import V2SearchPage from './pages/V2SearchPage';
import AiJournalHomePage from './pages/AiJournalHomePage';
import AiJournalBooksPage from './pages/AiJournalBooksPage';
import AiJournalNotesPage from './pages/AiJournalNotesPage';
import AiJournalNoteEditorPage from './pages/AiJournalNoteEditorPage';
import AiJournalOneOnOnePage from './pages/AiJournalOneOnOnePage';
import AiJournalOneOnOneSummariesPage from './pages/AiJournalOneOnOneSummariesPage';
import AiJournalImportPage from './pages/AiJournalImportPage';

function AppShell() {
  const { isAuthenticated, isLoading: authLoading, isAuthEnabled, login } = useAuth();
  const initializeThinkingMonth = useThinkingReflectionStore((state) => state.initializeMonth);
  const loading = useThinkingReflectionStore((state) => state.loading);
  const initialLoadStatus = useThinkingReflectionStore((state) => state.initialLoadStatus);
  const thinkingError = useThinkingReflectionStore((state) => state.error);

  useEffect(() => {
    if (isAuthEnabled && !isAuthenticated) {
      return;
    }
    void initializeThinkingMonth(format(new Date(), 'yyyy-MM'));
  }, [initializeThinkingMonth, isAuthEnabled, isAuthenticated]);

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
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-main)] font-sans">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-[rgba(251,250,247,0.86)] backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-2 sm:min-h-14 sm:py-0">
            <AppVersionSwitcher />
            <h1 className="hidden font-serif text-[21px] font-medium tracking-[0.02em] text-stone-700 md:block">Inner Space</h1>
            <AuthStatus />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">
          {loading && initialLoadStatus !== 'ready' ? <p className="text-sm text-stone-500">Loading...</p> : null}
          {thinkingError ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{thinkingError}</p> : null}
          <Routes>
            <Route path="/" element={<EntryPage />} />
            <Route path="/todo" element={<TodoPage />} />
            <Route path="/ai-journal/home" element={<AiJournalHomePage />} />
            <Route path="/ai-journal/books" element={<AiJournalBooksPage />} />
            <Route path="/ai-journal/notes" element={<AiJournalNotesPage />} />
            <Route path="/ai-journal/notes/:noteId" element={<AiJournalNoteEditorPage />} />
            <Route path="/ai-journal/1on1" element={<AiJournalOneOnOnePage />} />
            <Route path="/ai-journal/1on1/summaries" element={<AiJournalOneOnOneSummariesPage />} />
            <Route path="/ai-journal/import" element={<AiJournalImportPage />} />
            <Route path="/v2/home" element={<V2HomePage />} />
            <Route path="/v2/timeline" element={<V2TimelinePage />} />
            <Route path="/v2/search" element={<V2SearchPage />} />
            <Route path="/v2/calendar" element={<V2CalendarPage />} />
            <Route path="/v2/day/:date" element={<V2DayPage />} />
            <Route path="/v2/day/:date/thinking" element={<V2ThinkingReflectionPage />} />
            <Route path="/v2/week/:weekStart/thinking" element={<V2ThinkingWeekPage />} />
            <Route path="/v2/month/:monthKey/thinking" element={<V2ThinkingMonthPage />} />
            <Route path="*" element={<Navigate to="/v2/home" replace />} />
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
