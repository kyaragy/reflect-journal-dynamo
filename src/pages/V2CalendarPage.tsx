import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarRange, Sparkles } from 'lucide-react';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

export default function V2CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const hasMountedRef = useRef(false);
  const navigate = useNavigate();
  const days = useThinkingReflectionStore((state) => state.days);
  const refreshMonth = useThinkingReflectionStore((state) => state.initializeMonth);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    void refreshMonth(format(currentMonth, 'yyyy-MM'));
  }, [currentMonth, refreshMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows = [];
  let day = startDate;
  while (day <= endDate) {
    const weekStartKey = format(day, 'yyyy-MM-dd');
    const weekCells = [];
    let hasWeekReflection = false;

    for (let index = 0; index < 7; index += 1) {
      const currentDay = addDays(day, index);
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      const record = days.find((item) => item.date === dateKey);
      const memoCount = record?.memoCards.length ?? 0;
      const hasReflection = Boolean(record?.thinkingReflection);
      if (hasReflection) {
        hasWeekReflection = true;
      }

      weekCells.push(
        <button
          key={dateKey}
          type="button"
          onClick={() => navigate(`/v2/day/${dateKey}`)}
          className={[
            'relative flex h-24 flex-col items-center justify-center border border-stone-100 text-sm transition-colors',
            !isSameMonth(currentDay, monthStart) ? 'bg-stone-50/60 text-stone-300' : 'bg-white text-stone-700 hover:bg-sky-50',
            hasReflection ? 'border-sky-200 bg-sky-50/70' : '',
            isSameDay(currentDay, new Date()) ? 'font-semibold text-stone-900' : '',
          ].join(' ')}
        >
          <span
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full',
              isSameDay(currentDay, new Date()) ? 'bg-sky-700 text-white' : '',
            ].join(' ')}
          >
            {format(currentDay, 'd')}
          </span>
          {memoCount > 0 ? <span className="mt-2 text-xs text-stone-500">{memoCount}件</span> : null}
          {hasReflection ? <Sparkles className="absolute bottom-2 h-4 w-4 text-sky-600" /> : null}
        </button>
      );
    }

    rows.push(
      <div key={weekStartKey} className="grid grid-cols-[repeat(7,1fr)_auto]">
        {weekCells}
        <button
          type="button"
          onClick={() => navigate(`/v2/week/${weekStartKey}/thinking`)}
          className={[
            'flex w-12 items-center justify-center border border-stone-100 transition-colors',
            hasWeekReflection
              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'bg-white text-stone-300 hover:bg-stone-50 hover:text-stone-600',
          ].join(' ')}
          title="週次ふりかえり"
        >
          <CalendarRange className="h-4 w-4" />
        </button>
      </div>
    );

    day = addDays(day, 7);
  }

  return (
    <div className="animate-in fade-in duration-500">
      <section className="mb-6 rounded-3xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Thinking Reflection PoC</p>
        <h2 className="mt-2 font-serif text-3xl text-slate-900">新版カレンダー</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          日中は軽く記録し、夜にChatGPTのJSONを取り込んで思考振り返りを保存します。
        </p>
      </section>

      <div className="mb-6 flex items-center justify-between">
        <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-full p-2 hover:bg-stone-100">
          <ChevronLeft className="h-5 w-5 text-stone-600" />
        </button>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/v2/month/${format(currentMonth, 'yyyy-MM')}/thinking`)}
            className="font-serif text-2xl text-stone-900 underline decoration-sky-300 decoration-2 underline-offset-4 transition-colors hover:text-sky-700"
          >
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/v2/month/${format(currentMonth, 'yyyy-MM')}/thinking`)}
            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            月次ふりかえり
          </button>
        </div>
        <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-full p-2 hover:bg-stone-100">
          <ChevronRight className="h-5 w-5 text-stone-600" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-[repeat(7,1fr)_auto]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="py-2 text-center text-sm font-medium text-stone-500">
            {format(addDays(startDate, index), 'E', { locale: ja })}
          </div>
        ))}
        <div className="py-2 text-center text-sm font-medium text-stone-400">週</div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-stone-200 shadow-sm">{rows}</div>
    </div>
  );
}
