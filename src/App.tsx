/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AuthStatus from './components/AuthStatus';
import CalendarPage from './pages/CalendarPage';
import DayPage from './pages/DayPage';
import WeekPage from './pages/WeekPage';
import MonthPage from './pages/MonthPage';
import YearPage from './pages/YearPage';

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
