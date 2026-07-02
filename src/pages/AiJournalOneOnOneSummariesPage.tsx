import { useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAiJournalStore } from '../store/useAiJournalStore';

const formatDateTime = (value: string) => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};

const resolveSummaryPreview = (content: string) => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || '要点はまだありません。';
};

export default function AiJournalOneOnOneSummariesPage() {
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const initialize = useAiJournalStore((state) => state.initialize);
  const error = useAiJournalStore((state) => state.error);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const summaries = useMemo(
    () =>
      notes
        .filter((note) => note.type === 'OneOnOneSummary')
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [notes]
  );
  const summaryGroups = useMemo(() => {
    const grouped = summaries.reduce<Record<string, typeof summaries>>((accumulator, summary) => {
      const date = parseISO(summary.createdAt);
      const key = Number.isNaN(date.getTime()) ? '未分類' : format(date, 'yyyy年M月');
      accumulator[key] = [...(accumulator[key] ?? []), summary];
      return accumulator;
    }, {});

    return Object.entries(grouped).sort(([left], [right]) => right.localeCompare(left));
  }, [summaries]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-sky-200 bg-sky-50/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-sky-600">1on1サマリ</p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.02em] text-stone-900">過去の1on1</h2>
            <p className="mt-2 text-sm text-stone-700">取り込んだ1on1サマリノートを新しい順に見返せます。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/ai-journal/home')}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              ホームへ戻る
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/1on1')}
              className="rounded-2xl bg-sky-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
            >
              1on1を始める
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="space-y-7">
        {summaries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-stone-700">まだ1on1サマリはありません。</p>
            <p className="mt-2 text-sm text-stone-500">1on1準備ページでJSONを取り込むと、ここに1on1サマリノートが並びます。</p>
          </div>
        ) : (
          summaryGroups.map(([monthLabel, monthSummaries]) => (
            <section key={monthLabel}>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-base font-semibold text-stone-900">{monthLabel}</h3>
                <p className="text-xs text-stone-400">{monthSummaries.length}件</p>
              </div>
              <div className="divide-y divide-stone-100">
                {monthSummaries.map((summary) => (
                  <button
                    key={summary.id}
                    type="button"
                    onClick={() => navigate(`/ai-journal/notes/${summary.id}`)}
                    className="flex w-full items-start justify-between gap-4 py-5 text-left transition-colors hover:bg-stone-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700">1on1サマリ</span>
                      <p className="text-[15.5px] font-semibold tracking-[-0.01em] text-stone-900">{summary.title || '1on1まとめ'}</p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-[1.7] text-stone-600">{resolveSummaryPreview(summary.content)}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1">対象ノート {summary.targetNoteIds?.length ?? 0}件</span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1">テーマ {summary.discussedThemes?.length ?? 0}件</span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1">気づき {summary.insights?.length ?? 0}件</span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1">次回への問い {summary.nextQuestions?.length ?? 0}件</span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1">最終更新 {formatDateTime(summary.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] leading-5 text-stone-400">{formatDateTime(summary.createdAt)}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm text-sky-700">
                        開く
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </div>
  );
}
