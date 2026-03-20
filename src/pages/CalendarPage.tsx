import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileText, Calendar as CalendarIcon, PenSquare } from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence } from 'motion/react';
import JournalForm from '../components/JournalForm';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const navigate = useNavigate();
  const journalDays = useJournalStore((state) => state.days);
  const weeklySummaries = useJournalStore((state) => state.weeklySummaries);
  const refreshMonth = useJournalStore((state) => state.refreshMonth);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const todayRecord = journalDays.find((day) => day.date === todayKey);
  const todayCount = todayRecord?.cards.length ?? 0;
  const hasTodaySummary = Boolean(todayRecord?.dailySummary.trim());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const closeQuickEntry = () => setIsQuickEntryOpen(false);

  useEffect(() => {
    void refreshMonth(format(currentMonth, 'yyyy-MM'));
  }, [currentMonth, refreshMonth]);

  const onDateClick = (day: Date) => {
    navigate(`/day/${format(day, 'yyyy-MM-dd')}`);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-stone-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <h2 className="text-2xl font-serif font-medium text-stone-800">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-stone-200 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 0 }); // 0 is Sunday
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-medium text-sm text-stone-500 py-2">
          {format(addDays(startDate, i), 'E', { locale: ja })}
        </div>
      );
    }
    days.push(<div key="week-ref" className="w-8 sm:w-12"></div>);
    return <div className="grid grid-cols-[repeat(7,1fr)_auto] mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const dateFormat = 'd';
    const rows = [];
    let cells = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      const weekStartDate = format(day, 'yyyy-MM-dd');
      const hasWeeklyReflection = Boolean(
        weeklySummaries.find((summary) => summary.weekKey === weekStartDate)?.summary.trim()
      );
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dateString = format(cloneDay, 'yyyy-MM-dd');
        const dayRecord = journalDays.find((currentDay) => currentDay.date === dateString);
        const entryCount = dayRecord?.cards.length ?? 0;
        const hasEntries = entryCount > 0;
        const hasDailyReflection = Boolean(dayRecord?.dailySummary.trim());

        cells.push(
          <div
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
            className={cn(
              "relative flex flex-col items-center justify-center h-20 sm:h-24 border border-stone-100 cursor-pointer transition-all duration-200",
              !isSameMonth(day, monthStart)
                ? "text-stone-300 bg-stone-50/50"
                : "text-stone-700 hover:bg-stone-100",
              isSameDay(day, new Date()) && "font-bold text-stone-900",
              hasEntries && isSameMonth(day, monthStart) && "bg-stone-100/50",
              hasDailyReflection && isSameMonth(day, monthStart) && "bg-sky-100 border-sky-200 hover:bg-sky-200"
            )}
          >
            <span className={cn(
              "text-sm sm:text-base",
              isSameDay(day, new Date()) && "bg-stone-800 text-stone-50 w-7 h-7 flex items-center justify-center rounded-full"
            )}>
              {formattedDate}
            </span>
            
            {hasEntries && (
              <div className="absolute bottom-2 flex gap-1">
                {Array.from({ length: Math.min(entryCount, 3) }).map((_, idx) => (
                  <div key={idx} className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                ))}
                {entryCount > 3 && <div className="w-1.5 h-1.5 rounded-full bg-stone-500 opacity-50" />}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-[repeat(7,1fr)_auto] group" key={weekStartDate}>
          {cells}
          <div 
            onClick={() => navigate(`/week/${weekStartDate}`)}
            className={cn(
              "w-8 sm:w-12 flex items-center justify-center border-b border-l border-stone-100 cursor-pointer transition-colors",
              hasWeeklyReflection
                ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                : "text-stone-300 hover:text-stone-600 hover:bg-stone-50"
            )}
            title="週の振り返り"
          >
            <FileText className="w-4 h-4" />
          </div>
        </div>
      );
      cells = [];
    }
    return <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">{rows}</div>;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <section className="mb-6 rounded-3xl border border-stone-200 bg-white/90 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Today</p>
            <h2 className="mt-2 font-serif text-2xl text-stone-800">
              {format(today, 'M月d日', { locale: ja })}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {todayCount > 0 ? `${todayCount}件の記録があります` : '思いついた今のまま書き始められます'}
              {hasTodaySummary ? ' · 1日のまとめあり' : ''}
            </p>
          </div>
          <button
            onClick={() => setIsQuickEntryOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-stone-800 px-4 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700"
          >
            <PenSquare className="h-4 w-4" />
            今日を書く
          </button>
        </div>
      </section>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
        <button
          onClick={() => navigate(`/month/${format(currentMonth, 'yyyy-MM')}`)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-800 text-stone-50 rounded-xl font-medium hover:bg-stone-700 transition-colors shadow-sm"
        >
          <CalendarIcon className="w-5 h-5" />
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}の振り返り
        </button>
        <button
          onClick={() => navigate(`/year/${format(currentMonth, 'yyyy')}`)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition-colors shadow-sm"
        >
          <FileText className="w-5 h-5" />
          {format(currentMonth, 'yyyy年', { locale: ja })}の振り返り
        </button>
      </div>

      <AnimatePresence>
        {isQuickEntryOpen && (
          <JournalForm
            date={todayKey}
            onClose={closeQuickEntry}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
