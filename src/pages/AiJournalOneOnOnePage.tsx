import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Copy, FileJson, MessagesSquare, Search, Upload, X } from 'lucide-react';
import { AI_NOTE_TYPE_ORDER, formatAiNoteTypeLabel, type AiJournalNote, type AiNoteType } from '../domain/aiJournal';
import { useAiJournalStore } from '../store/useAiJournalStore';
import { useOneOnOneStore } from '../store/useOneOnOneStore';

const currentJournalMonthLabel = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric' })
  .format(new Date())
  .replace('/', '年')
  .replace('/', '月');

type PickerView = 'all' | 'Journal' | 'Book' | 'Work' | 'OneOnOneSummary';
type PickerSort = 'updatedAt' | 'createdAt' | 'title';

type NotePickerModalProps = {
  title: string;
  description: string;
  notes: AiJournalNote[];
  selectedIds: string[];
  filterTypes: AiNoteType[] | 'summaryOnly';
  isOpen: boolean;
  onClose: () => void;
  onToggle: (noteId: string) => void;
  onClear: () => void;
};

const formatOneOnOneUsageLabel = (count: number) => {
  if (count <= 0) {
    return '未使用';
  }
  return `1on1 ${count}回`;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
};

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

const matchesSearch = (note: AiJournalNote, query: string) => {
  if (!query.trim()) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  return [
    note.title,
    note.content,
    note.type,
    note.book?.officialTitle ?? '',
    note.book?.author ?? '',
    ...(note.book?.themes ?? []),
  ].some((value) => value.toLowerCase().includes(normalized));
};

const sortNotes = (items: AiJournalNote[], sortBy: PickerSort) => {
  const sorted = [...items];

  if (sortBy === 'createdAt') {
    return sorted.sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.title.localeCompare(right.title, 'ja'));
  }

  if (sortBy === 'title') {
    return sorted.sort((left, right) => resolveNoteHeadline(left).localeCompare(resolveNoteHeadline(right), 'ja'));
  }

  return sorted.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, 'ja'));
};

function SelectedNotesSummary({
  title,
  notes,
  selectedIds,
  emptyLabel,
}: {
  title: string;
  notes: AiJournalNote[];
  selectedIds: string[];
  emptyLabel: string;
}) {
  const selectedNotes = notes.filter((note) => selectedIds.includes(note.id));

  return (
    <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-900">{title}</p>
          <p className="text-xs text-stone-500">{selectedNotes.length}件選択中</p>
        </div>
      </div>
      {selectedNotes.length === 0 ? (
        <p className="text-sm text-stone-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {selectedNotes.slice(0, 4).map((note) => (
            <div key={note.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">{formatAiNoteTypeLabel(note.type)}</span>
                <p className="text-sm font-medium text-stone-900">{resolveNoteHeadline(note)}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-[1.7] text-stone-500">{resolveNotePreview(note)}</p>
            </div>
          ))}
          {selectedNotes.length > 4 ? <p className="text-xs text-stone-400">他 {selectedNotes.length - 4}件</p> : null}
        </div>
      )}
    </div>
  );
}

function NotePickerModal({ title, description, notes, selectedIds, filterTypes, isOpen, onClose, onToggle, onClear }: NotePickerModalProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PickerView>('all');
  const [sortBy, setSortBy] = useState<PickerSort>('updatedAt');
  const [openJournalMonths, setOpenJournalMonths] = useState<string[]>([currentJournalMonthLabel]);
  const [openBookGroups, setOpenBookGroups] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setTypeFilter('all');
      setSortBy('updatedAt');
    }
  }, [isOpen]);

  const availableTypes = useMemo(() => {
    if (filterTypes === 'summaryOnly') {
      return ['OneOnOneSummary'] as AiNoteType[];
    }
    return filterTypes;
  }, [filterTypes]);

  const availableViews = useMemo(
    () =>
      (['all', 'Journal', 'Book', 'Work', 'OneOnOneSummary'] as PickerView[]).filter(
        (type) => type === 'all' || availableTypes.includes(type)
      ),
    [availableTypes]
  );

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (!availableTypes.includes(note.type)) {
        return false;
      }
      if (typeFilter !== 'all' && note.type !== typeFilter) {
        return false;
      }
      return matchesSearch(note, query);
    });
  }, [availableTypes, notes, query, typeFilter]);

  const allViewNotes = useMemo(() => sortNotes(filteredNotes, sortBy), [filteredNotes, sortBy]);

  const groupedJournalNotes = useMemo(() => {
    const grouped = filteredNotes
      .filter((note) => note.type === 'Journal')
      .reduce<Record<string, AiJournalNote[]>>((accumulator, note) => {
        const date = new Date(note.title || note.createdAt);
        const monthKey = Number.isNaN(date.getTime()) ? '未分類' : `${date.getFullYear()}年${date.getMonth() + 1}月`;
        accumulator[monthKey] = [...(accumulator[monthKey] ?? []), note];
        return accumulator;
      }, {});

    return (Object.entries(grouped) as Array<[string, AiJournalNote[]]>)
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([monthLabel, monthNotes]) => ({
        monthLabel,
        notes: sortNotes(monthNotes, sortBy),
      }));
  }, [filteredNotes, sortBy]);

  const groupedBookNotes = useMemo(() => {
    const grouped = filteredNotes
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
      .map(([bookTitle, groupedNotes]) => ({
        bookTitle,
        notes: sortNotes(groupedNotes, sortBy),
        latestUpdatedAt: sortNotes(groupedNotes, 'updatedAt')[0]?.updatedAt ?? '',
      }));
  }, [filteredNotes, sortBy]);

  const selectedNotes = useMemo(() => notes.filter((note) => selectedIds.includes(note.id)), [notes, selectedIds]);
  const selectedPreviewNotes = selectedNotes.slice(0, 3);

  const renderPickerRow = (note: AiJournalNote, secondaryLabel?: string) => {
    const isSelected = selectedIds.includes(note.id);

    return (
      <button
        key={note.id}
        type="button"
        onClick={() => onToggle(note.id)}
        className={`flex w-full items-start justify-between gap-4 border-l-2 py-3 pl-3 pr-2 text-left transition-colors hover:bg-stone-50 ${
          isSelected ? 'border-sky-500 bg-sky-50/70' : 'border-transparent'
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(note.id)}
            onClick={(event) => event.stopPropagation()}
            className="mt-1 h-4 w-4 rounded border-stone-300"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">{formatAiNoteTypeLabel(note.type)}</span>
              <p className="truncate text-sm font-medium text-stone-900">{resolveNoteHeadline(note)}</p>
            </div>
            <p className="mt-1 line-clamp-1 text-sm text-stone-500">{resolveNotePreview(note)}</p>
            {secondaryLabel ? <p className="mt-1 text-xs text-stone-400">{secondaryLabel}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] text-stone-400">
          <p>{formatDateTime(note.updatedAt)}</p>
          <p className="mt-1">{formatOneOnOneUsageLabel(note.relatedSummaryIds.length)}</p>
        </div>
      </button>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/35 px-4 py-6">
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5">
          <div>
            <h4 className="text-xl font-semibold text-stone-900">{title}</h4>
            <p className="mt-1 text-sm text-stone-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 border-b border-stone-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {availableViews.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  typeFilter === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {type === 'all' ? 'すべて' : formatAiNoteTypeLabel(type)}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-3">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="タイトル・本文を検索"
                className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-3">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as PickerSort)}
                className="w-full bg-transparent text-sm text-stone-900 outline-none"
              >
                <option value="updatedAt">最近更新</option>
                <option value="createdAt">作成日</option>
                <option value="title">タイトル</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onClear}
              className="rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              選択解除
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            {filteredNotes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-sm text-stone-500">一致するノートがありません。</p>
            ) : null}

            {typeFilter === 'all' ? <div className="divide-y divide-stone-100">{allViewNotes.map((note) => renderPickerRow(note, formatAiNoteTypeLabel(note.type)))}</div> : null}

            {typeFilter === 'Journal' ? (
              <div className="space-y-6">
                {groupedJournalNotes.map((group) => {
                  const isOpen = openJournalMonths.includes(group.monthLabel);

                  return (
                    <section key={group.monthLabel}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenJournalMonths((current) =>
                            current.includes(group.monthLabel) ? current.filter((item) => item !== group.monthLabel) : [...current, group.monthLabel]
                          )
                        }
                        className="flex w-full items-center justify-between border-b border-stone-200 pb-2 text-left"
                      >
                        <h5 className="text-sm font-semibold text-stone-900">{group.monthLabel}</h5>
                        <p className="text-xs text-stone-400">{isOpen ? '折りたたむ' : `${group.notes.length}件`}</p>
                      </button>
                      {isOpen ? <div className="divide-y divide-stone-100">{group.notes.map((note) => renderPickerRow(note, note.title || group.monthLabel))}</div> : null}
                    </section>
                  );
                })}
              </div>
            ) : null}

            {typeFilter === 'Book' ? (
              <div className="space-y-6">
                {groupedBookNotes.map((group) => {
                  const isOpen = openBookGroups.includes(group.bookTitle);

                  return (
                    <section key={group.bookTitle}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenBookGroups((current) =>
                            current.includes(group.bookTitle) ? current.filter((item) => item !== group.bookTitle) : [...current, group.bookTitle]
                          )
                        }
                        className="flex w-full items-center justify-between border-b border-stone-200 pb-2 text-left"
                      >
                        <div className="min-w-0">
                          <h5 className="truncate text-sm font-semibold text-stone-900">{group.bookTitle}</h5>
                          <p className="mt-1 text-xs text-stone-400">
                            {group.notes.length}件 / 最終更新 {formatDateTime(group.latestUpdatedAt)}
                          </p>
                        </div>
                        <p className="text-xs text-stone-400">{isOpen ? '折りたたむ' : '展開'}</p>
                      </button>
                      {isOpen ? (
                        <div className="divide-y divide-stone-100">
                          {group.notes.map((note) => renderPickerRow(note, note.book?.author ? `著者 ${note.book.author}` : '書籍情報未設定'))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : null}

            {typeFilter !== 'all' && typeFilter !== 'Journal' && typeFilter !== 'Book' ? (
              <div className="divide-y divide-stone-100">{sortNotes(filteredNotes, sortBy).map((note) => renderPickerRow(note))}</div>
            ) : null}
          </div>

          <aside className="hidden border-l border-stone-100 bg-stone-50/60 px-5 py-5 md:block">
            <div>
              <h5 className="text-sm font-semibold text-stone-900">選択中ノート</h5>
              <p className="mt-1 text-xs text-stone-500">{selectedIds.length}件選択中</p>
            </div>
            {selectedNotes.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">まだ選択されていません。</p>
            ) : (
              <div className="mt-4 space-y-2">
                {selectedNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onToggle(note.id)}
                    className="block w-full rounded-2xl bg-white px-3 py-3 text-left transition-colors hover:bg-stone-100"
                  >
                    <p className="text-xs text-stone-500">{formatAiNoteTypeLabel(note.type)}</p>
                    <p className="mt-1 text-sm font-medium text-stone-900">{resolveNoteHeadline(note)}</p>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-6 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm text-stone-500">{selectedIds.length}件選択中</p>
            {selectedPreviewNotes.map((note) => (
              <span key={note.id} className="max-w-[220px] truncate rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-800">
                {resolveNoteHeadline(note)}
              </span>
            ))}
            {selectedNotes.length > selectedPreviewNotes.length ? <span className="text-sm text-stone-500">他 {selectedNotes.length - selectedPreviewNotes.length}件</span> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={selectedIds.length === 0}
            className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            選択を確定
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiJournalOneOnOnePage() {
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const initializeNotes = useAiJournalStore((state) => state.initialize);
  const initializeOneOnOne = useOneOnOneStore((state) => state.initialize);
  const createPromptRun = useOneOnOneStore((state) => state.createPromptRun);
  const importSummaryJson = useOneOnOneStore((state) => state.importSummaryJson);
  const latestPromptText = useOneOnOneStore((state) => state.latestPromptText);
  const latestSummaryNoteId = useOneOnOneStore((state) => state.latestSummaryNoteId);
  const saving = useOneOnOneStore((state) => state.saving);
  const error = useOneOnOneStore((state) => state.error);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [rawJson, setRawJson] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [importedSummaryId, setImportedSummaryId] = useState<string | null>(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  useEffect(() => {
    void initializeNotes();
    void initializeOneOnOne();
  }, [initializeNotes, initializeOneOnOne]);

  const targetCandidates = useMemo(() => notes.filter((note) => note.type !== 'OneOnOneSummary'), [notes]);
  const summaryNotes = useMemo(() => notes.filter((note) => note.type === 'OneOnOneSummary'), [notes]);

  useEffect(() => {
    if (selectedContextIds.length > 0 || summaryNotes.length === 0) {
      return;
    }

    const latestSummary = [...summaryNotes].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (latestSummary) {
      setSelectedContextIds([latestSummary.id]);
    }
  }, [selectedContextIds.length, summaryNotes]);

  const latestSummaryNote = useMemo(
    () => summaryNotes.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null,
    [summaryNotes]
  );

  const toggleTarget = (noteId: string) => {
    setSelectedTargetIds((current) => (current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]));
  };

  const toggleContext = (noteId: string) => {
    setSelectedContextIds((current) => (current.includes(noteId) ? current.filter((id) => id !== noteId) : [...current, noteId]));
  };

  const handleGeneratePrompt = async () => {
    await createPromptRun(selectedTargetIds, selectedContextIds);
    navigate('/ai-journal/1on1');
    setCopyStatus('idle');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latestPromptText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const handleImport = async () => {
    setValidationMessage(null);
    setImportedSummaryId(null);

    try {
      const result = await importSummaryJson(rawJson);
      setValidationMessage('1on1サマリノートを作成しました。');
      setImportedSummaryId(result.summaryNoteId);
    } catch (importError) {
      setValidationMessage(importError instanceof Error ? importError.message : '取込に失敗しました。');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-sky-200 bg-sky-50/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-sky-600">1on1</p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.02em] text-stone-900">1on1準備とサマリ取り込み</h2>
            <p className="mt-2 text-sm text-stone-700">対象ノートの選択、プロンプト生成、ChatGPT結果JSONの取り込みまでを1画面で進めます。</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/ai-journal/1on1/summaries')}
              className="inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              過去の1on1を見る
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-journal/home')}
              className="inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-sky-700" />
            <div>
              <h3 className="text-lg font-semibold text-stone-900">素材を選ぶ</h3>
              <p className="mt-1 text-sm leading-7 text-stone-500">1on1で使うノートと、必要なら過去の1on1メモを選びます。</p>
            </div>
          </div>

          <section className="space-y-4 rounded-2xl bg-stone-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Step 1</p>
                <h4 className="mt-1 text-base font-semibold text-stone-900">対象ノート</h4>
                <p className="text-sm leading-7 text-stone-500">検索付きの選択画面から、今回の1on1対象を選びます。</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTargetIds([])}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                >
                  解除
                </button>
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(true)}
                  className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800"
                >
                  ノートを選ぶ
                </button>
              </div>
            </div>
            <SelectedNotesSummary
              title="選択中のノート"
              notes={targetCandidates}
              selectedIds={selectedTargetIds}
              emptyLabel="まだノートを選択していません。"
            />
          </section>

          <section className="space-y-4 rounded-2xl bg-stone-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Step 2</p>
                <h4 className="mt-1 text-base font-semibold text-stone-900">過去1on1メモ</h4>
                <p className="text-sm leading-7 text-stone-500">必要に応じて、過去の1on1サマリを文脈として追加します。</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedContextIds([])}
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                >
                  解除
                </button>
                <button
                  type="button"
                  onClick={() => setIsContextModalOpen(true)}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-stone-900 ring-1 ring-stone-300 transition-colors hover:bg-stone-50"
                >
                  過去メモを選ぶ
                </button>
              </div>
            </div>
            <SelectedNotesSummary
              title="選択中の過去1on1メモ"
              notes={summaryNotes}
              selectedIds={selectedContextIds}
              emptyLabel="文脈として使う過去メモは未選択です。"
            />
          </section>
        </section>

        <section className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-emerald-700" />
            <div>
              <h3 className="text-lg font-semibold text-stone-900">生成と取り込み</h3>
              <p className="mt-1 text-sm leading-7 text-stone-500">プロンプトを作り、ChatGPTの結果をそのまま取り込みます。</p>
            </div>
          </div>

          <section className="space-y-4 rounded-2xl bg-sky-50/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Step 3</p>
                <h4 className="mt-1 text-base font-semibold text-stone-900">プロンプト生成</h4>
                <p className="text-sm text-stone-600">
                  対象ノート {selectedTargetIds.length}件、過去まとめ {selectedContextIds.length}件。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleGeneratePrompt()}
                  disabled={saving || selectedTargetIds.length === 0}
                  className="inline-flex items-center justify-center rounded-2xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  プロンプトを生成
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={!latestPromptText}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-white px-3 py-3 text-sm text-stone-700 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  コピー
                </button>
              </div>
            </div>
            {selectedTargetIds.length === 0 ? <p className="text-xs text-rose-600">少なくとも1件の対象ノートを選択してください。</p> : null}

              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900">生成結果</p>
                    <p className="text-sm text-stone-500">{latestPromptText ? '選択中ノートをもとに生成したプロンプトです。' : 'まだ生成していません。'}</p>
                  </div>
                </div>

              {latestPromptText ? (
                <textarea
                  value={latestPromptText}
                  readOnly
                  className="mt-4 min-h-[280px] w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-stone-900 outline-none"
                />
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-stone-700">まだプロンプトは生成されていません。</p>
                  <p className="mt-2 text-sm text-stone-500">左側で対象ノートを選び、`プロンプトを生成` を押すとここに結果が表示されます。</p>
                </div>
              )}
              {copyStatus === 'copied' ? <p className="mt-2 text-xs text-emerald-700">クリップボードへコピーしました。</p> : null}
              {copyStatus === 'failed' ? <p className="mt-2 text-xs text-rose-700">コピーに失敗しました。</p> : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-emerald-50/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Step 4</p>
                <h4 className="mt-1 text-base font-semibold text-stone-900">1on1サマリを作成</h4>
                <p className="text-sm text-stone-500">
                  ChatGPTの出力JSONを貼り付けると、1on1サマリノートを作成し、対象ノートと参照した過去まとめにリンクします。
                </p>
              </div>
            </div>

            <textarea
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              placeholder='{"schemaVersion":"1.0","type":"1on1Summary",...}'
              className="min-h-[260px] w-full rounded-2xl border border-emerald-200 bg-white px-4 py-4 text-sm leading-6 text-stone-900 outline-none transition-colors focus:border-emerald-400"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={saving || rawJson.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                1on1サマリを作成
              </button>
              {(importedSummaryId ?? latestSummaryNoteId) ? (
                <button
                  type="button"
                  onClick={() => navigate(`/ai-journal/notes/${importedSummaryId ?? latestSummaryNoteId}`)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  作成した1on1サマリを見る
                </button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white px-4 py-4 text-sm text-stone-600">
              作成後は 1on1サマリノートとして保存されます。対象ノート側からも関連サマリとして参照できます。
            </div>

            {validationMessage ? <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700">{validationMessage}</p> : null}
          </section>
        </section>
      </section>

      {latestSummaryNote ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Latest Summary</p>
              <h3 className="mt-1 text-lg font-semibold text-stone-900">直近の1on1サマリ</h3>
              <p className="mt-2 text-sm text-stone-600">{latestSummaryNote.title || '1on1まとめ'}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/ai-journal/notes/${latestSummaryNote.id}`)}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
            >
              開く
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : null}

      <NotePickerModal
        title="ノートを選択"
        description="1on1で扱いたいノートを選んでください。"
        notes={targetCandidates}
        selectedIds={selectedTargetIds}
        filterTypes={AI_NOTE_TYPE_ORDER.filter((type) => type !== 'OneOnOneSummary')}
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onToggle={toggleTarget}
        onClear={() => setSelectedTargetIds([])}
      />

      <NotePickerModal
        title="過去1on1メモを選択"
        description="文脈として参照したい1on1サマリを選んでください。"
        notes={summaryNotes}
        selectedIds={selectedContextIds}
        filterTypes="summaryOnly"
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        onToggle={toggleContext}
        onClear={() => setSelectedContextIds([])}
      />
    </div>
  );
}
