import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, CalendarRange, Copy, Sparkles, Upload } from 'lucide-react';
import ThinkingPromptModal from '../components/thinking/ThinkingPromptModal';
import WeeklyReflectionImportModal from '../components/thinking/WeeklyReflectionImportModal';
import WeeklyReflectionPreview from '../components/thinking/WeeklyReflectionPreview';
import { getWeekEnd, generateWeeklyReflectionPrompt } from '../lib/weeklyReflectionPrompt';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

export default function V2ThinkingWeekPage() {
  const { weekStart } = useParams<{ weekStart: string }>();
  const navigate = useNavigate();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [userNoteDraft, setUserNoteDraft] = useState('');

  const days = useThinkingReflectionStore((state) => state.days);
  const weeks = useThinkingReflectionStore((state) => state.weeks);
  const refreshDay = useThinkingReflectionStore((state) => state.refreshDay);
  const refreshWeek = useThinkingReflectionStore((state) => state.refreshWeek);
  const saveWeeklyReflection = useThinkingReflectionStore((state) => state.saveWeeklyReflection);
  const saveWeeklyUserNote = useThinkingReflectionStore((state) => state.saveWeeklyUserNote);
  const saving = useThinkingReflectionStore((state) => state.saving);

  useEffect(() => {
    if (!weekStart) {
      return;
    }

    const dateKeys = Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStart), index), 'yyyy-MM-dd'));
    void Promise.all([...dateKeys.map((date) => refreshDay(date)), refreshWeek(weekStart)]);
  }, [refreshDay, refreshWeek, weekStart]);

  if (!weekStart) {
    return null;
  }

  const weekEnd = getWeekEnd(weekStart);
  const dateKeys = Array.from({ length: 7 }, (_, index) => format(addDays(parseISO(weekStart), index), 'yyyy-MM-dd'));
  const weekDays = dateKeys
    .map((date) => days.find((item) => item.date === date))
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.thinkingReflection));
  const weekRecord = weeks.find((item) => item.weekStart === weekStart) ?? null;
  const reflection = weekRecord?.reflection ?? null;
  const userNote = weekRecord?.userNote ?? null;
  const sourceDayCount = weekDays.length;
  const weeklyPrompt = useMemo(() => generateWeeklyReflectionPrompt(weekStart, weekDays), [weekDays, weekStart]);

  useEffect(() => {
    setUserNoteDraft(userNote?.note ?? '');
  }, [userNote?.note]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/v2/calendar')} className="mb-6 flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        新版カレンダーへ戻る
      </button>

      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-500">Weekly Reflection</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-950">
            {format(parseISO(weekStart), 'yyyy年M月d日', { locale: ja })} 〜 {format(parseISO(weekEnd), 'M月d日', { locale: ja })}
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            日次材料 {sourceDayCount}日分
            {reflection ? ' · 週次結果あり' : ' · 週次結果未作成'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={sourceDayCount === 0}
            onClick={() => setIsPromptModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Copy className="h-4 w-4" />
            ChatGPT用に出力
          </button>
          <button
            type="button"
            disabled={sourceDayCount === 0}
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            JSONを取り込む
          </button>
          <button
            type="button"
            onClick={() => navigate(`/v2/day/${weekStart}`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            <CalendarRange className="h-4 w-4" />
            週の先頭日を見る
          </button>
        </div>
      </header>

      {reflection ? (
        <WeeklyReflectionPreview reflection={reflection} sourceDays={weekDays} />
      ) : (
        <section className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
          この週の週次ふりかえりはまだ保存されていません。まずは日次材料を ChatGPT 用に出力し、返却JSONを取り込んでください。
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-950">ユーザーの週次自由記述</h3>
            <p className="text-sm text-stone-500">週次AI結果とは別に、自分のメモを残せます。</p>
          </div>
        </div>
        <textarea
          value={userNoteDraft}
          onChange={(event) => setUserNoteDraft(event.target.value)}
          className="mt-4 min-h-[180px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-7 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          placeholder="今週を自分の言葉で振り返ってください。"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void saveWeeklyUserNote(weekStart, {
                week_start: weekStart,
                week_end: weekEnd,
                note: userNoteDraft,
                updated_at: new Date().toISOString(),
              })
            }
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {saving ? '保存中...' : '週次メモを保存'}
          </button>
        </div>
      </section>

      {isPromptModalOpen ? <ThinkingPromptModal prompt={weeklyPrompt} onClose={() => setIsPromptModalOpen(false)} /> : null}
      {isImportModalOpen ? (
        <WeeklyReflectionImportModal
          weekStart={weekStart}
          sourceDays={weekDays}
          saving={saving}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (nextReflection) => {
            await saveWeeklyReflection(weekStart, nextReflection);
            setIsImportModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
