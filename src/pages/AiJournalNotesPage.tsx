import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { formatAiNoteTypeLabel, resolveJournalMonthLabel, type AiJournalNote, type AiNoteType } from '../domain/aiJournal';
import { useAiJournalStore } from '../store/useAiJournalStore';

type NotesView = 'all' | 'Journal' | 'Book' | 'Work' | 'OneOnOneSummary';

const VIEW_OPTIONS: Array<{ id: NotesView; label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'Journal', label: 'Journal' },
  { id: 'Book', label: 'Book' },
  { id: 'Work', label: 'Work' },
  { id: 'OneOnOneSummary', label: '1on1サマリ' },
];

const CREATE_NOTE_TYPES: Array<'' | Exclude<AiNoteType, 'OneOnOneSummary'>> = ['', 'Journal', 'Book', 'Movie', 'Live', 'Work', 'Free'];

const formatDateTime = (value: string) => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};

const normalize = (value: string) => value.toLowerCase();

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
    return body.replace(/\n+/g, ' ');
  }

  return note.type === 'Book' ? '読書メモはまだありません。' : '本文なし';
};

const matchesSearch = (note: AiJournalNote, keyword: string) => {
  if (!keyword.trim()) {
    return true;
  }

  const normalized = normalize(keyword.trim());
  const searchable = [
    note.title,
    note.content,
    note.type,
    note.book?.officialTitle ?? '',
    note.book?.author ?? '',
    ...(note.book?.themes ?? []),
  ];

  return searchable.some((value) => normalize(value).includes(normalized));
};

const sortByUpdatedAt = (notes: AiJournalNote[]) =>
  [...notes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, 'ja'));

const currentJournalMonthLabel = format(new Date(), 'yyyy年M月');

const noteMatchesView = (note: AiJournalNote, activeView: NotesView) => {
  if (activeView === 'all') {
    return true;
  }
  return note.type === activeView;
};

const renderNoteRow = ({
  note,
  selectedIds,
  navigate,
  toggleSelection,
  secondaryLabel,
}: {
  note: AiJournalNote;
  selectedIds: string[];
  navigate: ReturnType<typeof useNavigate>;
  toggleSelection: (noteId: string) => void;
  secondaryLabel?: string;
}) => (
  <button
    key={note.id}
    type="button"
    onClick={() => navigate(`/ai-journal/notes/${note.id}`)}
    className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:bg-stone-50/70"
  >
    <div className="flex min-w-0 items-start gap-3">
      <input
        type="checkbox"
        checked={selectedIds.includes(note.id)}
        onChange={(event) => {
          event.stopPropagation();
          toggleSelection(note.id);
        }}
        onClick={(event) => event.stopPropagation()}
        className="mt-1 h-4 w-4 rounded border-stone-300"
      />
      <div className="min-w-0">
        <p className="truncate text-[15.5px] font-semibold tracking-[-0.01em] text-stone-900">{resolveNoteHeadline(note)}</p>
        <p className="mt-1 line-clamp-1 text-sm leading-[1.65] text-stone-600">{resolveNotePreview(note)}</p>
        {secondaryLabel ? <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">{secondaryLabel}</p> : null}
      </div>
    </div>
    <div className="shrink-0 text-right text-[12px] leading-[1.45] text-stone-400">
      <p>更新 {formatDateTime(note.updatedAt)}</p>
      <p className="mt-1">1on1 {note.oneOnOneRunIds.length}回</p>
    </div>
  </button>
);

export default function AiJournalNotesPage() {
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const loading = useAiJournalStore((state) => state.loading);
  const saving = useAiJournalStore((state) => state.saving);
  const error = useAiJournalStore((state) => state.error);
  const initialLoadStatus = useAiJournalStore((state) => state.initialLoadStatus);
  const initialize = useAiJournalStore((state) => state.initialize);
  const createNote = useAiJournalStore((state) => state.createNote);
  const deleteNotes = useAiJournalStore((state) => state.deleteNotes);
  const [keyword, setKeyword] = useState('');
  const [activeView, setActiveView] = useState<NotesView>('all');
  const [createType, setCreateType] = useState<'' | Exclude<AiNoteType, 'OneOnOneSummary'>>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openJournalMonths, setOpenJournalMonths] = useState<string[]>([currentJournalMonthLabel]);
  const [openBookGroups, setOpenBookGroups] = useState<string[]>([]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const selectedNotes = useMemo(() => notes.filter((note) => selectedIds.includes(note.id)), [notes, selectedIds]);
  const viewCounts = useMemo(
    () => ({
      all: notes.length,
      Journal: notes.filter((note) => note.type === 'Journal').length,
      Book: notes.filter((note) => note.type === 'Book').length,
      Work: notes.filter((note) => note.type === 'Work').length,
      OneOnOneSummary: notes.filter((note) => note.type === 'OneOnOneSummary').length,
    }),
    [notes]
  );

  const visibleNotes = useMemo(
    () => notes.filter((note) => noteMatchesView(note, activeView) && matchesSearch(note, keyword)),
    [activeView, keyword, notes]
  );

  const allViewNotes = useMemo(() => sortByUpdatedAt(visibleNotes), [visibleNotes]);

  const journalGroups = useMemo(() => {
    const grouped = visibleNotes
      .filter((note) => note.type === 'Journal')
      .reduce<Record<string, AiJournalNote[]>>((accumulator, note) => {
        const key = resolveJournalMonthLabel(note);
        accumulator[key] = [...(accumulator[key] ?? []), note];
        return accumulator;
      }, {});

    return (Object.entries(grouped) as Array<[string, AiJournalNote[]]>)
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([monthLabel, monthNotes]) => ({
        monthLabel,
        notes: [...monthNotes].sort((left, right) => right.title.localeCompare(left.title) || right.updatedAt.localeCompare(left.updatedAt)),
      }));
  }, [visibleNotes]);

  const bookGroups = useMemo(() => {
    const grouped = visibleNotes
      .filter((note) => note.type === 'Book')
      .reduce<Record<string, AiJournalNote[]>>((accumulator, note) => {
        const key = note.book?.officialTitle?.trim() || '本未設定';
        accumulator[key] = [...(accumulator[key] ?? []), note];
        return accumulator;
      }, {});

    return (Object.entries(grouped) as Array<[string, AiJournalNote[]]>)
      .sort(([left], [right]) => {
        if (left === '本未設定') return 1;
        if (right === '本未設定') return -1;
        return left.localeCompare(right, 'ja');
      })
      .map(([title, bookNotes]) => ({
        title,
        notes: [...bookNotes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, 'ja')),
        latestUpdatedAt: [...bookNotes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.updatedAt ?? '',
      }));
  }, [visibleNotes]);

  const workNotes = useMemo(() => sortByUpdatedAt(visibleNotes.filter((note) => note.type === 'Work')), [visibleNotes]);
  const summaryNotes = useMemo(
    () => sortByUpdatedAt(visibleNotes.filter((note) => note.type === 'OneOnOneSummary')),
    [visibleNotes]
  );

  const toggleSelection = (noteId: string) => {
    setSelectedIds((current) => (current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]));
  };

  const toggleJournalMonth = (monthLabel: string) => {
    setOpenJournalMonths((current) =>
      current.includes(monthLabel) ? current.filter((item) => item !== monthLabel) : [...current, monthLabel]
    );
  };

  const toggleBookGroup = (title: string) => {
    setOpenBookGroups((current) => (current.includes(title) ? current.filter((item) => item !== title) : [...current, title]));
  };

  const handleCreateNote = async (type: '' | Exclude<AiNoteType, 'OneOnOneSummary'>) => {
    const note = await createNote(type);
    navigate(`/ai-journal/notes/${note.id}`);
  };

  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) {
      return;
    }

    const confirmed = window.confirm(`選択した ${selectedNotes.length} 件のノートを削除します。元に戻せません。`);
    if (!confirmed) {
      return;
    }

    await deleteNotes(selectedNotes.map((note) => note.id));
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <section className="px-1 pt-2">
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-serif text-3xl text-stone-900">ノート一覧</h2>
            <p className="mt-2 text-sm text-stone-600">ノート数が増えても探しやすいよう、種別ごとのビューで切り替えて確認できます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleDeleteSelected()}
              disabled={saving || selectedIds.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              選択を削除
            </button>
            <button
              type="button"
              onClick={() => void handleCreateNote(createType)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              新規作成
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/home')}
              className="inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      </section>

      {loading && initialLoadStatus !== 'ready' ? <p className="text-sm text-stone-500">読み込み中...</p> : null}
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section className="space-y-4 border-r border-stone-200 pr-5 xl:pr-6">
            <div>
              <h3 className="text-base font-semibold text-stone-900">ビュー</h3>
              <p className="mt-1 text-sm text-stone-500">表示したい種別に切り替えます。</p>
            </div>
            <div className="space-y-2">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveView(option.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors ${
                    activeView === option.id ? 'bg-amber-50 text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span>{option.label}</span>
                  <span className="text-stone-400">{viewCounts[option.id]}件</span>
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-stone-50 px-3 py-3 text-sm text-stone-600">
              <p className="font-medium text-stone-800">{selectedIds.length}件を選択中</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">チェックしたノートを削除できます。</p>
            </div>
          </section>

          <section className="space-y-4 border-r border-stone-200 pr-5 xl:pr-6">
            <div>
              <h3 className="text-base font-semibold text-stone-900">検索</h3>
              <p className="mt-1 text-sm text-stone-500">現在のビュー内を絞り込みます。</p>
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-3">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="タイトル・本文を検索"
                className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </label>
          </section>

          <section className="space-y-3 border-r border-stone-200 pr-5 xl:pr-6">
            <div>
              <h3 className="text-base font-semibold text-stone-900">新規作成</h3>
              <p className="mt-1 text-sm text-stone-500">作成したいノート種別を選びます。</p>
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-3">
              <Plus className="h-4 w-4 text-stone-500" />
              <select
                value={createType}
                onChange={(event) => setCreateType(event.target.value as '' | Exclude<AiNoteType, 'OneOnOneSummary'>)}
                className="w-full bg-transparent text-sm text-stone-900 outline-none"
              >
                {CREATE_NOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatAiNoteTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </aside>

        <div className="min-w-0">
          {selectedNotes.length > 0 ? (
            <section className="mb-5 rounded-2xl bg-amber-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">選択中ノート {selectedNotes.length}件</p>
                  <p className="text-xs text-stone-500">1on1素材として選ぶ前段の選択状態です。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                >
                  選択解除
                </button>
              </div>
            </section>
          ) : null}

          {activeView === 'all' ? (
            <section>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-base font-semibold text-stone-900">すべて</h3>
                <p className="text-xs text-stone-400">{allViewNotes.length}件</p>
              </div>
              <div className="divide-y divide-stone-100">
                {allViewNotes.length === 0 ? (
                  <p className="py-8 text-sm text-stone-500">一致するノートがありません。</p>
                ) : (
                  allViewNotes.map((note) =>
                    renderNoteRow({
                      note,
                      selectedIds,
                      navigate,
                      toggleSelection,
                      secondaryLabel: formatAiNoteTypeLabel(note.type),
                    })
                  )
                )}
              </div>
            </section>
          ) : null}

          {activeView === 'Journal' ? (
            <section className="space-y-7">
              {journalGroups.length === 0 ? <p className="py-8 text-sm text-stone-500">一致するJournalがありません。</p> : null}
              {journalGroups.map((group) => {
                const isOpen = openJournalMonths.includes(group.monthLabel);

                return (
                  <section key={group.monthLabel}>
                    <button
                      type="button"
                      onClick={() => toggleJournalMonth(group.monthLabel)}
                      className="flex w-full items-center justify-between border-b border-stone-200 pb-2 text-left"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-stone-900">{group.monthLabel}</h3>
                        <p className="mt-1 text-xs text-stone-400">{group.notes.length}件</p>
                      </div>
                      <p className="text-xs font-medium text-stone-400">{isOpen ? '折りたたむ' : '展開する'}</p>
                    </button>
                    {isOpen ? (
                      <div className="divide-y divide-stone-100">
                        {group.notes.map((note) =>
                          renderNoteRow({
                            note,
                            selectedIds,
                            navigate,
                            toggleSelection,
                            secondaryLabel: note.title || resolveJournalMonthLabel(note),
                          })
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </section>
          ) : null}

          {activeView === 'Book' ? (
            <section className="space-y-7">
              {bookGroups.length === 0 ? <p className="py-8 text-sm text-stone-500">一致するBookノートがありません。</p> : null}
              {bookGroups.map((group) => {
                const isOpen = openBookGroups.includes(group.title);

                return (
                  <section key={group.title}>
                    <button
                      type="button"
                      onClick={() => toggleBookGroup(group.title)}
                      className="flex w-full items-center justify-between border-b border-stone-200 pb-2 text-left"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-stone-900">{group.title}</h3>
                        <p className="mt-1 text-xs text-stone-400">
                          {group.notes.length}件 / 最終更新 {formatDateTime(group.latestUpdatedAt)}
                        </p>
                      </div>
                      <p className="text-xs text-stone-400">{isOpen ? '折りたたむ' : '展開'}</p>
                    </button>
                    {isOpen ? (
                      <div className="divide-y divide-stone-100">
                        {group.notes.map((note) =>
                          renderNoteRow({
                            note,
                            selectedIds,
                            navigate,
                            toggleSelection,
                            secondaryLabel: note.book?.author ? `著者 ${note.book.author}` : '書籍情報未設定',
                          })
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </section>
          ) : null}

          {activeView === 'Work' ? (
            <section>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-base font-semibold text-stone-900">Work</h3>
                <p className="text-xs text-stone-400">{workNotes.length}件</p>
              </div>
              <div className="divide-y divide-stone-100">
                {workNotes.length === 0 ? (
                  <p className="py-8 text-sm text-stone-500">一致するWorkノートがありません。</p>
                ) : (
                  workNotes.map((note) => renderNoteRow({ note, selectedIds, navigate, toggleSelection }))
                )}
              </div>
            </section>
          ) : null}

          {activeView === 'OneOnOneSummary' ? (
            <section>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-base font-semibold text-stone-900">1on1サマリ</h3>
                <p className="text-xs text-stone-400">{summaryNotes.length}件</p>
              </div>
              <div className="divide-y divide-stone-100">
                {summaryNotes.length === 0 ? (
                  <p className="py-8 text-sm text-stone-500">一致する1on1サマリがありません。</p>
                ) : (
                  summaryNotes.map((note) => renderNoteRow({ note, selectedIds, navigate, toggleSelection }))
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
