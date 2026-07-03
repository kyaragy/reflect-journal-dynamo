import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { BookOpenText, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAiJournalStore } from '../store/useAiJournalStore';

const formatDateTime = (value: string) => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};

const resolveBookStatus = (hasBookInfo: boolean, startedOn: string, finishedOn: string) => {
  if (!hasBookInfo) {
    return '未設定';
  }
  if (finishedOn) {
    return '読了';
  }
  if (startedOn) {
    return '読書中';
  }
  return '積読';
};

export default function AiJournalBooksPage() {
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const initialize = useAiJournalStore((state) => state.initialize);
  const createNote = useAiJournalStore((state) => state.createNote);
  const saving = useAiJournalStore((state) => state.saving);
  const error = useAiJournalStore((state) => state.error);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'finished' | 'stacked' | 'unset'>('all');

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const books = useMemo(
    () =>
      notes
        .filter((note) => note.type === 'Book')
        .filter((note) => {
          const searchable = [
            note.title,
            note.content,
            note.book?.officialTitle ?? '',
            note.book?.author ?? '',
          ].join(' ').toLowerCase();
          return searchable.includes(keyword.trim().toLowerCase());
        })
        .filter((note) => {
          const hasBookInfo = Boolean(note.book?.officialTitle?.trim());
          const status = resolveBookStatus(hasBookInfo, note.book?.readingStartedOn ?? '', note.book?.readingFinishedOn ?? '');
          if (statusFilter === 'all') return true;
          if (statusFilter === 'reading') return status === '読書中';
          if (statusFilter === 'finished') return status === '読了';
          if (statusFilter === 'stacked') return status === '積読';
          return status === '未設定';
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, 'ja')),
    [keyword, notes, statusFilter]
  );
  const statusCounts = useMemo(() => {
    const counts = { all: 0, reading: 0, finished: 0, stacked: 0, unset: 0 };
    notes
      .filter((note) => note.type === 'Book')
      .forEach((note) => {
        const hasBookInfo = Boolean(note.book?.officialTitle?.trim());
        const status = resolveBookStatus(hasBookInfo, note.book?.readingStartedOn ?? '', note.book?.readingFinishedOn ?? '');
        counts.all += 1;
        if (status === '読書中') counts.reading += 1;
        if (status === '読了') counts.finished += 1;
        if (status === '積読') counts.stacked += 1;
        if (status === '未設定') counts.unset += 1;
      });
    return counts;
  }, [notes]);

  const handleCreateBook = async () => {
    const note = await createNote('Book');
    navigate(`/ai-journal/notes/${note.id}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Books</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900">本棚</h2>
            <p className="mt-2 text-sm leading-7 text-stone-700">読んでいる本や読書メモを管理します。気になる本を開いて、そのまま続きを書けます。</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
              <span className="rounded-full bg-white px-3 py-1.5">登録 {statusCounts.all}冊</span>
              <span className="rounded-full bg-white px-3 py-1.5">読書中 {statusCounts.reading}</span>
              <span className="rounded-full bg-white px-3 py-1.5">読了 {statusCounts.finished}</span>
              <span className="rounded-full bg-white px-3 py-1.5">積読 {statusCounts.stacked}</span>
            </div>
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
              onClick={() => void handleCreateBook()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              読書ノートを書く
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <Search className="h-4 w-4 text-stone-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="本のタイトル・著者・メモを検索"
              className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'すべて'],
              ['reading', '読書中'],
              ['finished', '読了'],
              ['stacked', '積読'],
              ['unset', '未設定'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id as typeof statusFilter)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  statusFilter === id ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {books.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center text-sm text-stone-500">
              まだ本が見つかりません。検索条件を変えるか、新しい本を追加してください。
            </div>
          ) : (
            books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/ai-journal/notes/${book.id}`)}
                className="flex h-full flex-col rounded-[1.75rem] border border-stone-200 bg-white p-5 text-left shadow-sm transition-colors hover:bg-stone-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-28 w-16 shrink-0 items-center justify-center rounded-[1.25rem] border border-emerald-200 bg-gradient-to-b from-emerald-100 to-emerald-50 text-emerald-700">
                    <BookOpenText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[17px] font-semibold tracking-[-0.01em] text-stone-900">{book.book?.officialTitle || book.title || '読書メモ'}</p>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                        {resolveBookStatus(Boolean(book.book?.officialTitle?.trim()), book.book?.readingStartedOn ?? '', book.book?.readingFinishedOn ?? '')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">{book.book?.author || '著者未設定'}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600">
                      {book.content || (book.book?.officialTitle ? '読書メモはまだありません。' : 'タイトルやメモから書籍情報を補完できます。')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-stone-400">
                  <div className="flex flex-wrap gap-2">
                    {(book.book?.themes ?? []).slice(0, 2).map((theme) => (
                      <span key={theme} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                        {theme}
                      </span>
                    ))}
                    {!book.book?.officialTitle?.trim() ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">情報を整える</span>
                    ) : null}
                    {book.book?.readingStartedOn ? (
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                        開始 {book.book.readingStartedOn}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p>更新 {formatDateTime(book.updatedAt)}</p>
                    <p className="mt-1">1on1 {book.relatedSummaryIds.length}回</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
