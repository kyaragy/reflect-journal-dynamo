import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eachWeekOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, CalendarRange, Copy, Sparkles, Upload } from 'lucide-react';
import ThinkingPromptModal from '../components/thinking/ThinkingPromptModal';
import MonthlyReflectionImportModal from '../components/thinking/MonthlyReflectionImportModal';
import MonthlyReflectionPreview from '../components/thinking/MonthlyReflectionPreview';
import { generateMonthlyReflectionPrompt, getMonthEnd, getMonthStart } from '../lib/monthlyReflectionPrompt';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

export default function V2ThinkingMonthPage() {
  const { monthKey } = useParams<{ monthKey: string }>();
  const navigate = useNavigate();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [userNoteDraft, setUserNoteDraft] = useState('');

  const weeks = useThinkingReflectionStore((state) => state.weeks);
  const months = useThinkingReflectionStore((state) => state.months);
  const refreshWeek = useThinkingReflectionStore((state) => state.refreshWeek);
  const refreshMonthRecord = useThinkingReflectionStore((state) => state.refreshMonthRecord);
  const saveMonthlyReflection = useThinkingReflectionStore((state) => state.saveMonthlyReflection);
  const saveMonthlyUserNote = useThinkingReflectionStore((state) => state.saveMonthlyUserNote);
  const saving = useThinkingReflectionStore((state) => state.saving);

  const monthStart = monthKey ? getMonthStart(monthKey) : '';
  const monthEnd = monthKey ? getMonthEnd(monthKey) : '';

  const weekStartsInMonth = useMemo(() => {
    if (!monthKey) {
      return [] as string[];
    }

    return eachWeekOfInterval(
      {
        start: startOfMonth(parseISO(`${monthKey}-01`)),
        end: endOfMonth(parseISO(`${monthKey}-01`)),
      },
      { weekStartsOn: 0 }
    ).map((date) => format(date, 'yyyy-MM-dd'));
  }, [monthKey]);

  useEffect(() => {
    if (!monthKey) {
      return;
    }

    void Promise.all([refreshMonthRecord(monthKey), ...weekStartsInMonth.map((weekStart) => refreshWeek(weekStart))]);
  }, [monthKey, refreshMonthRecord, refreshWeek, weekStartsInMonth]);

  const monthRecord = monthKey ? (months.find((item) => item.monthKey === monthKey) ?? null) : null;
  const reflection = monthRecord?.reflection ?? null;
  const userNote = monthRecord?.userNote ?? null;
  const sourceWeeks = useMemo(
    () =>
      weekStartsInMonth
        .map((weekStart) => weeks.find((item) => item.weekStart === weekStart))
        .filter((week): week is NonNullable<typeof week> => Boolean(week?.reflection)),
    [weekStartsInMonth, weeks]
  );
  const monthlyPrompt = useMemo(
    () => (monthKey ? generateMonthlyReflectionPrompt(monthKey, sourceWeeks) : ''),
    [monthKey, sourceWeeks]
  );

  useEffect(() => {
    setUserNoteDraft(userNote?.note ?? '');
  }, [userNote?.note]);

  if (!monthKey) {
    return null;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/v2/calendar')} className="mb-6 flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        新版カレンダーへ戻る
      </button>

      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-500">Monthly Reflection</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-950">
            {format(parseISO(monthStart), 'yyyy年M月', { locale: ja })}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            週次材料 {sourceWeeks.length}週分
            {reflection ? ' · 月次結果あり' : ' · 月次結果未作成'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={sourceWeeks.length === 0}
            onClick={() => setIsPromptModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Copy className="h-4 w-4" />
            ChatGPT用に出力
          </button>
          <button
            type="button"
            disabled={sourceWeeks.length === 0}
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            JSONを取り込む
          </button>
          <button
            type="button"
            onClick={() => navigate(`/v2/day/${monthStart}`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            <CalendarRange className="h-4 w-4" />
            月の先頭日を見る
          </button>
        </div>
      </header>

      {reflection ? (
        <MonthlyReflectionPreview reflection={reflection} sourceWeeks={sourceWeeks} />
      ) : (
        <section className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
          この月の月次ふりかえりはまだ保存されていません。まずは週次材料を ChatGPT 用に出力し、返却JSONを取り込んでください。
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-950">ユーザーの月次自由記述</h3>
            <p className="text-sm text-stone-500">月次AI結果とは別に、自分のメモを残せます。</p>
          </div>
        </div>
        <textarea
          value={userNoteDraft}
          onChange={(event) => setUserNoteDraft(event.target.value)}
          className="mt-4 min-h-[180px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-7 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="今月を自分の言葉で振り返ってください。"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveMonthlyUserNote(monthKey, {
                month_start: monthStart,
                month_end: monthEnd,
                note: userNoteDraft,
                updated_at: new Date().toISOString(),
              })
            }
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {saving ? '保存中...' : '月次メモを保存'}
          </button>
        </div>
      </section>

      {isPromptModalOpen ? <ThinkingPromptModal prompt={monthlyPrompt} onClose={() => setIsPromptModalOpen(false)} /> : null}
      {isImportModalOpen ? (
        <MonthlyReflectionImportModal
          monthKey={monthKey}
          sourceWeeks={sourceWeeks}
          saving={saving}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (nextReflection) => {
            await saveMonthlyReflection(monthKey, nextReflection);
            setIsImportModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
