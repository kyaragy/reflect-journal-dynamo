import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

export default function V2TimelinePage() {
  const navigate = useNavigate();
  const days = useThinkingReflectionStore((state) => state.days);

  const timelineEntries = useMemo(
    () =>
      [...days]
        .sort((left, right) => right.date.localeCompare(left.date))
        .flatMap((day) =>
          day.entries
            .map((entry) => ({ day: day.date, entry }))
            .sort((left, right) => right.entry.createdAt.localeCompare(left.entry.createdAt))
        ),
    [days]
  );

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/v2/home')} className="flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        ホームへ戻る
      </button>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Timeline</p>
        <h2 className="mt-2 font-serif text-3xl text-stone-900">時系列ライフログ</h2>
        <p className="mt-2 text-sm text-stone-600">本文・タグ・mood を時系列で確認できます。</p>
      </section>

      <section className="space-y-4">
        {timelineEntries.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
            まだ記録がありません。まずは今日の記録を追加してください。
          </div>
        ) : null}

        {timelineEntries.map(({ day, entry }) => (
          <article key={entry.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                {format(parseISO(entry.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/v2/day/${day}`)}
                className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                その日を開く
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{entry.body}</p>
            {entry.tags?.length ? <p className="mt-3 text-xs text-stone-500">{entry.tags.join(' ')}</p> : null}
            {entry.mood ? <p className="mt-2 text-xs text-stone-500">mood: {entry.mood}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}
