import { BookOpenText, FilePlus2, FileStack, MessagesSquare, Sparkles } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatAiNoteTypeLabel, type AiJournalNote } from '../domain/aiJournal';
import { useAiJournalStore } from '../store/useAiJournalStore';

const resolveNoteHeadline = (note: AiJournalNote) => {
  if (note.title.trim()) {
    return note.title;
  }

  if (note.content.trim()) {
    return note.content.trim().split('\n')[0];
  }

  return `${formatAiNoteTypeLabel(note.type)} ノート`;
};

const resolveNotePreview = (note: AiJournalNote) => {
  const body = note.content.trim();
  if (body) {
    return body;
  }

  if (note.type === 'Book') {
    return '読書メモをまだ書いていません。';
  }

  return '本文なし';
};

const resolveSummaryPreview = (note: AiJournalNote) => {
  const firstLine = note.content
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .find(Boolean);
  return firstLine || 'まだ要点はありません。';
};

const resolveBookStatus = (note: AiJournalNote) => {
  if (note.type !== 'Book') {
    return '';
  }
  if (!note.book?.officialTitle?.trim()) {
    return '未設定';
  }
  if (note.book.readingFinishedOn) {
    return '読了';
  }
  if (note.book.readingStartedOn) {
    return '読書中';
  }
  return '積読';
};

export default function AiJournalHomePage() {
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const initialize = useAiJournalStore((state) => state.initialize);
  const createNote = useAiJournalStore((state) => state.createNote);
  const saving = useAiJournalStore((state) => state.saving);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const recentNotes = [...notes]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
  const bookNotes = useMemo(
    () =>
      notes
        .filter((note) => note.type === 'Book')
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [notes]
  );
  const recentOtherNotes = [...notes]
    .filter((note) => note.type === '')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 2);

  const latestSummaryNote = [...notes]
    .filter((note) => note.type === 'OneOnOneSummary')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

  const lastOneOnOneDate = latestSummaryNote ? parseISO(latestSummaryNote.createdAt) : null;
  const daysSinceLastOneOnOne =
    lastOneOnOneDate && !Number.isNaN(lastOneOnOneDate.getTime())
      ? differenceInCalendarDays(new Date(), lastOneOnOneDate)
      : null;

  const handleCreateJournal = async () => {
    const note = await createNote('Journal');
    navigate(`/ai-journal/notes/${note.id}`);
  };

  const handleCreateBook = async () => {
    const note = await createNote('Book');
    navigate(`/ai-journal/notes/${note.id}`);
  };

  const handleCreateOtherNote = async () => {
    const note = await createNote('');
    navigate(`/ai-journal/notes/${note.id}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-amber-200 bg-amber-50/65 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">AI Journal Workspace</p>
        <h2 className="mt-2 font-serif text-3xl text-stone-900">AIジャーナル・1on1</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
          使い方ごとに入口を分けています。ジャーナリング、1on1、読書ノート、その他記録からそのまま始められます。
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/40">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">ジャーナリング・1on1</h3>
            <MessagesSquare className="h-5 w-5 text-amber-700" />
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-600">日々の記録を書き、必要なタイミングで1on1につなげます。</p>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => void handleCreateJournal()}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-medium">ノート作成</p>
                <p className="mt-1 text-sm text-stone-600">Journalを1件作成して、そのまま書き始めます。</p>
              </div>
              <FilePlus2 className="h-5 w-5 text-amber-700" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/1on1')}
              className="flex w-full items-center justify-between rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-sky-100"
            >
              <div>
                <p className="font-medium">1on1を始める</p>
                <p className="mt-1 text-sm text-sky-700">対象ノートを選び、1on1準備とサマリ取り込みを進めます。</p>
              </div>
              <MessagesSquare className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/1on1/summaries')}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-stone-900 transition-colors hover:bg-stone-50"
            >
              <div>
                <p className="font-medium">過去の1on1を見る</p>
                <p className="mt-1 text-sm text-stone-600">取り込んだ1on1サマリノートを一覧で見返します。</p>
              </div>
              <FileStack className="h-5 w-5 text-stone-500" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/notes')}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-stone-100"
            >
              <div>
                <p className="font-medium">ノート一覧</p>
                <p className="mt-1 text-sm text-stone-600">既存ノートの確認と編集に入ります。</p>
              </div>
              <FileStack className="h-5 w-5 text-stone-500" />
            </button>
            {latestSummaryNote ? (
              <button
                type="button"
                onClick={() => navigate(`/ai-journal/notes/${latestSummaryNote.id}`)}
                className="block w-full rounded-2xl border border-dashed border-sky-200 bg-white px-4 py-4 text-left transition-colors hover:bg-sky-50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">前回の1on1</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-stone-900">{latestSummaryNote.title || '1on1まとめ'}</p>
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                    {format(parseISO(latestSummaryNote.createdAt), 'yyyy-MM-dd')}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-stone-600">{resolveSummaryPreview(latestSummaryNote)}</p>
              </button>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/40">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">読書ノート</h3>
            <BookOpenText className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-600">本ごとの読書メモを管理し、書籍情報の補完や1on1活用につなげます。</p>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => navigate('/ai-journal/books')}
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-emerald-100"
            >
              <div>
                <p className="font-medium">本棚を見る</p>
                <p className="mt-1 text-sm text-emerald-700">登録した本を開いて、読書メモの続きをそのまま書けます。</p>
              </div>
              <BookOpenText className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleCreateBook()}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-left text-stone-900 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-medium">読書ノートを書く</p>
                <p className="mt-1 text-sm text-stone-600">新しい本を追加して、読書メモを書き始めます。</p>
              </div>
              <FilePlus2 className="h-5 w-5 text-emerald-700" />
            </button>
            <div className="rounded-2xl border border-dashed border-emerald-200 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">本棚の状態</p>
                  <p className="mt-1 text-sm text-stone-700">{bookNotes.length}冊登録中</p>
                </div>
                {bookNotes[0] ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{resolveBookStatus(bookNotes[0])}</span>
                ) : null}
              </div>
              {bookNotes[0] ? (
                <button
                  type="button"
                  onClick={() => navigate(`/ai-journal/notes/${bookNotes[0].id}`)}
                  className="mt-3 block w-full rounded-2xl bg-white px-3 py-3 text-left transition-colors hover:bg-emerald-50"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">最近更新した本</p>
                  <p className="text-sm font-medium text-stone-900">{bookNotes[0].book?.officialTitle || bookNotes[0].title || '最近更新した本'}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500">{resolveNotePreview(bookNotes[0])}</p>
                </button>
              ) : (
                <p className="mt-3 text-sm text-stone-500">まだ本が登録されていません。新しい本を追加すると、ここからすぐ再開できます。</p>
              )}
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/40">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-stone-900">その他ノート</h3>
            <Sparkles className="h-5 w-5 text-stone-500" />
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-600">映画、ライブ、その他の記録用に、種別未設定のノートから始めます。</p>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => void handleCreateOtherNote()}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-left text-stone-900 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="font-medium">ノート作成</p>
                <p className="mt-1 text-sm text-stone-600">種別未設定で作成し、あとから Movie や Live などへ切り替えます。</p>
              </div>
              <FilePlus2 className="h-5 w-5 text-stone-500" />
            </button>
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">最近のその他ノート</p>
              {recentOtherNotes.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">まだありません。映画やライブの記録を残すと、ここから再開できます。</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {recentOtherNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate(`/ai-journal/notes/${note.id}`)}
                      className="block w-full rounded-2xl bg-white px-3 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <p className="text-sm font-medium text-stone-900">{resolveNoteHeadline(note)}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-stone-500">{resolveNotePreview(note)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">最近触ったノート</h3>
              <p className="text-sm text-stone-600">直近で更新したノートからすぐ再開できます。</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/notes')}
              className="rounded-2xl border border-stone-300 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              一覧を見る
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {recentNotes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-500">まだノートがありません。</p>
            ) : (
              recentNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate(`/ai-journal/notes/${note.id}`)}
                  className="flex w-full items-start justify-between rounded-2xl border border-stone-200 px-4 py-4 text-left transition-colors hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                        {formatAiNoteTypeLabel(note.type)}
                      </span>
                      <p className="min-w-0 truncate font-medium text-stone-900">{resolveNoteHeadline(note)}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{resolveNotePreview(note)}</p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-xs text-stone-400">{format(parseISO(note.updatedAt), 'MM-dd HH:mm')}</p>
                    <p className="mt-2 text-xs text-stone-400">1on1 {note.relatedSummaryIds.length}回</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm shadow-stone-100/40">
          <h3 className="text-lg font-semibold text-stone-900">1on1のタイミング</h3>
          {lastOneOnOneDate && daysSinceLastOneOnOne !== null ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4">
                <p className="text-sm text-sky-700">前回の1on1</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{format(lastOneOnOneDate, 'yyyy-MM-dd')}</p>
                <p className="mt-2 text-sm text-sky-800">前回から {daysSinceLastOneOnOne}日 経過しています。</p>
              </div>
              <div className="rounded-2xl border border-stone-200 px-4 py-4">
                <p className="text-sm font-medium text-stone-800">
                  {daysSinceLastOneOnOne >= 7 ? 'そろそろ1on1を回すタイミングです。' : 'まだ少し間隔を見ても大丈夫です。'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  {daysSinceLastOneOnOne >= 7 ? 'そろそろ1on1を回して、変化をまとめるタイミングです。' : '前回の1on1からまだ日が浅いです。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/ai-journal/1on1')}
                className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100"
              >
                1on1を始める
              </button>
              {latestSummaryNote ? (
                <button
                  type="button"
                  onClick={() => navigate(`/ai-journal/notes/${latestSummaryNote.id}`)}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  前回のまとめを見る
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-200 px-4 py-6">
              <p className="text-sm text-stone-500">まだ1on1の実施履歴がありません。</p>
              <button
                type="button"
                onClick={() => navigate('/ai-journal/1on1')}
                className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-100"
              >
                最初の1on1を始める
              </button>
              <button
                type="button"
                onClick={() => navigate('/ai-journal/1on1/summaries')}
                className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                過去の1on1を見る
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
