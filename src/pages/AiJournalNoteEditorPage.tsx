import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, FileJson, PencilLine, Save, Upload } from 'lucide-react';
import { AI_NOTE_TYPE_ORDER, formatAiNoteTypeLabel } from '../domain/aiJournal';
import { createEmptyBookProperties, type BookProperties } from '../domain/book';
import { buildBookPropertiesPrompt } from '../domain/book';
import { useAiJournalStore } from '../store/useAiJournalStore';

const EDITABLE_NOTE_TYPES = ['' as const, ...AI_NOTE_TYPE_ORDER.filter((noteType) => noteType !== 'OneOnOneSummary')];
const JOURNAL_PROMPT_CHIPS = ['今日あったこと', '引っかかったこと', '相談したいこと', '次に試したいこと'];
const BOOK_PROMPT_CHIPS = ['印象に残った箇所', '自分に刺さったこと', '試したいこと', '1on1で話したいこと'];

const formatDateTime = (value: string) => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};

const resolveJournalTitleFallback = (createdAt: string) => {
  const date = parseISO(createdAt);
  if (!Number.isNaN(date.getTime())) {
    return format(date, 'yyyy-MM-dd');
  }

  return '無題のジャーナル';
};

const renderSummaryList = (items: string[] | undefined, emptyLabel: string) => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-2xl bg-stone-50 px-3 py-3 text-sm leading-7 text-stone-700">
          {item}
        </li>
      ))}
    </ul>
  );
};

const hasItems = (items: string[] | undefined) => Boolean(items && items.length > 0);

const renderSummaryBullets = (items: string[] | undefined, emptyLabel: string, tone: 'default' | 'highlight' = 'default') => {
  if (!items || items.length === 0) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className={`rounded-2xl px-3.5 py-3 text-sm leading-7 ${
            tone === 'highlight' ? 'bg-white/80 text-stone-800 ring-1 ring-sky-100' : 'bg-stone-50 text-stone-700'
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

const renderSummaryBody = (content: string) => {
  if (!content.trim()) {
    return <p className="text-sm text-stone-500">本文がありません。</p>;
  }

  return content.split('\n').map((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return <div key={`summary-space-${index}`} className="h-3" />;
    }

    if (trimmedLine.startsWith('## ')) {
      return (
        <h4 key={`summary-heading-${index}`} className="pt-2 text-sm font-semibold tracking-[0.01em] text-stone-900">
          {trimmedLine.replace(/^##\s+/, '')}
        </h4>
      );
    }

    if (trimmedLine.startsWith('# ')) {
      return (
        <h4 key={`summary-heading-${index}`} className="pt-2 text-base font-semibold tracking-[0.01em] text-stone-900">
          {trimmedLine.replace(/^#\s+/, '')}
        </h4>
      );
    }

    if (trimmedLine.startsWith('- ')) {
      return (
        <p key={`summary-bullet-${index}`} className="pl-4 text-[15px] leading-[1.85] text-stone-800">
          <span className="ml-[-0.9rem] inline-block w-4 text-stone-400">•</span>
          {trimmedLine.replace(/^- /, '')}
        </p>
      );
    }

    return (
      <p key={`summary-line-${index}`} className="text-[15.5px] leading-[1.9] text-stone-800">
        {trimmedLine}
      </p>
    );
  });
};

const resolveLinkedNotePreview = (note: { content: string }) => {
  const line = note.content
    .split('\n')
    .map((item) => item.trim())
    .find(Boolean);
  return line || '本文なし';
};

export default function AiJournalNoteEditorPage() {
  const { noteId = '' } = useParams();
  const navigate = useNavigate();
  const notes = useAiJournalStore((state) => state.notes);
  const initialize = useAiJournalStore((state) => state.initialize);
  const getNoteById = useAiJournalStore((state) => state.getNoteById);
  const saveNote = useAiJournalStore((state) => state.saveNote);
  const importBookProperties = useAiJournalStore((state) => state.importBookProperties);
  const updateBookProperties = useAiJournalStore((state) => state.updateBookProperties);
  const loading = useAiJournalStore((state) => state.loading);
  const saving = useAiJournalStore((state) => state.saving);
  const error = useAiJournalStore((state) => state.error);
  const note = useAiJournalStore((state) => state.notes.find((item) => item.id === noteId));
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'' | (typeof AI_NOTE_TYPE_ORDER)[number]>('');
  const [content, setContent] = useState('');
  const [bookRawJson, setBookRawJson] = useState('');
  const [bookImportMessage, setBookImportMessage] = useState<string | null>(null);
  const [bookPromptCopyStatus, setBookPromptCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [bookDraft, setBookDraft] = useState<BookProperties>(createEmptyBookProperties());

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!note) {
      return;
    }
    setTitle(note.title);
    setType(note.type);
    setContent(note.content);
    setBookDraft(note.book ?? createEmptyBookProperties());
  }, [note]);

  const persistedNote = useMemo(() => getNoteById(noteId), [getNoteById, noteId, note]);
  const isJournalNote = persistedNote?.type === 'Journal';
  const isBookNote = persistedNote?.type === 'Book';
  const relatedTargetNotes = useMemo(
    () => notes.filter((candidate) => persistedNote?.targetNoteIds?.includes(candidate.id)),
    [notes, persistedNote]
  );
  const relatedContextNotes = useMemo(
    () => notes.filter((candidate) => persistedNote?.contextSummaryIds?.includes(candidate.id)),
    [notes, persistedNote]
  );
  const bookPromptText = useMemo(() => {
    if (!persistedNote || persistedNote.type !== 'Book') {
      return '';
    }
    return buildBookPropertiesPrompt(persistedNote.id, title, content)(bookDraft);
  }, [bookDraft, content, persistedNote, title]);
  const isDirty = Boolean(
    persistedNote && (persistedNote.title !== title || persistedNote.type !== type || persistedNote.content !== content)
  );
  const isBookDirty = Boolean(
    persistedNote?.type === 'Book' &&
      JSON.stringify(persistedNote.book ?? createEmptyBookProperties()) !== JSON.stringify(bookDraft)
  );
  const hasRelatedMeta = Boolean(persistedNote && (persistedNote.oneOnOneRunIds.length > 0 || persistedNote.relatedSummaryIds.length > 0));
  const saveStatusLabel = saving
    ? '保存中'
    : isDirty
      ? '未保存の変更あり'
      : isBookDirty
        ? '書籍情報に未保存の変更あり'
        : `最終保存: ${formatDateTime(persistedNote?.lastSavedAt ?? '')}`;
  const journalTitleFallback = useMemo(
    () => (persistedNote ? resolveJournalTitleFallback(persistedNote.createdAt) : '無題のジャーナル'),
    [persistedNote]
  );
  const journalDisplayTitle = title.trim() || journalTitleFallback;
  const bookHeaderTitle = bookDraft.officialTitle || title || '読書メモ';

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty && !isBookDirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isBookDirty, isDirty]);

  const handleLeave = (path: string) => {
    if ((isDirty || isBookDirty) && !window.confirm('未保存の変更があります。破棄して移動しますか？')) {
      return;
    }
    navigate(path);
  };

  const handleSave = async () => {
    if (!persistedNote) {
      return;
    }

    const normalizedTitle = persistedNote.type === 'Journal' ? title.trim() || journalTitleFallback : title;

    if (persistedNote.type === 'Journal' && normalizedTitle !== title) {
      setTitle(normalizedTitle);
    }

    await saveNote(persistedNote.id, {
      type,
      title: normalizedTitle,
      content,
    });
  };

  const handleCopyBookPrompt = async () => {
    try {
      await navigator.clipboard.writeText(bookPromptText);
      setBookPromptCopyStatus('copied');
    } catch {
      setBookPromptCopyStatus('failed');
    }
  };

  const handleImportBookJson = async () => {
    setBookImportMessage(null);

    try {
      const updatedNote = await importBookProperties(bookRawJson);
      if (updatedNote?.book) {
        setBookDraft(updatedNote.book);
      }
      setBookImportMessage(updatedNote ? '本情報を取り込みました。' : '本情報の取り込みに失敗しました。');
    } catch (importError) {
      setBookImportMessage(importError instanceof Error ? importError.message : '本情報の取り込みに失敗しました。');
    }
  };

  const handleSaveBookProperties = async () => {
    if (!persistedNote || persistedNote.type !== 'Book') {
      return;
    }

    const updatedNote = await updateBookProperties(persistedNote.id, bookDraft);
    if (updatedNote?.book) {
      setBookDraft(updatedNote.book);
    }
    setBookImportMessage('書籍情報を保存しました。');
  };

  const handleInsertJournalPrompt = (promptLabel: string) => {
    setContent((current) => {
      const prefix = current.trim().length === 0 ? '' : '\n\n';
      return `${current}${prefix}${promptLabel}\n`;
    });
  };

  const handleInsertBookPrompt = (promptLabel: string) => {
    setContent((current) => {
      const prefix = current.trim().length === 0 ? '' : '\n\n';
      return `${current}${prefix}${promptLabel}\n`;
    });
  };

  if (loading && !persistedNote) {
    return <p className="text-sm text-stone-500">読み込み中...</p>;
  }

  if (!persistedNote) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        対象ノートが見つかりません。ノート一覧から作成し直してください。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {persistedNote.type !== 'OneOnOneSummary' ? (
        <section
          className={`rounded-3xl p-6 shadow-sm ${
            isJournalNote
              ? 'border border-amber-200 bg-amber-50/70'
              : isBookNote
                ? 'border border-emerald-200 bg-emerald-50/70'
                : 'border border-amber-200 bg-amber-50/80'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isBookNote ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isJournalNote ? 'Today Journal' : isBookNote ? 'Reading Note' : 'Note Editor'}
              </p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900">
                {isJournalNote ? journalDisplayTitle : isBookNote ? bookHeaderTitle : persistedNote.title || 'ノート編集'}
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                {isJournalNote
                  ? `Journal · 作成日 ${formatDateTime(persistedNote.createdAt)} · ${saveStatusLabel}`
                  : isBookNote
                    ? `Book · ${saveStatusLabel}`
                    : `${formatAiNoteTypeLabel(persistedNote.type)} · ${saveStatusLabel}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLeave(isBookNote ? '/ai-journal/books' : '/ai-journal/notes')}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
              >
                <ArrowLeft className="h-4 w-4" />
                {isBookNote ? '本棚へ戻る' : '一覧へ戻る'}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? '保存中' : '保存'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {persistedNote.type === 'OneOnOneSummary' ? (
        <section className="space-y-6">
          <section className="rounded-3xl border border-sky-200 bg-sky-50/70 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-sky-700">1on1サマリ</p>
                <h3 className="mt-2 text-[2rem] font-semibold tracking-[-0.02em] text-stone-900">
                  {persistedNote.title || '1on1まとめ'}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-600">
                  <span className="rounded-full bg-white/80 px-2.5 py-1">作成日 {formatDateTime(persistedNote.createdAt)}</span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1">対象ノート {relatedTargetNotes.length}件</span>
                  {relatedContextNotes.length > 0 ? (
                    <span className="rounded-full bg-white/80 px-2.5 py-1">過去まとめ {relatedContextNotes.length}件</span>
                  ) : null}
                  {hasItems(persistedNote.nextQuestions) ? (
                    <span className="rounded-full bg-white/80 px-2.5 py-1">次回確認 {persistedNote.nextQuestions?.length ?? 0}件</span>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/ai-journal/1on1/summaries')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  一覧へ戻る
                </button>
                {relatedTargetNotes[0] ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/ai-journal/notes/${relatedTargetNotes[0].id}`)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
                  >
                    関連ノートを見る
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <section className="rounded-3xl border border-sky-100 bg-sky-50/35 p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-stone-900">今回の要点</h3>

              {hasItems(persistedNote.discussedThemes) ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">今回話したテーマ</p>
                  {renderSummaryBullets(persistedNote.discussedThemes, '今回話したテーマはありません。', 'highlight')}
                </div>
              ) : null}

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">1on1で見えたこと</p>
                <div className="space-y-3 rounded-3xl bg-white/88 px-4 py-4 ring-1 ring-sky-100/80">{renderSummaryBody(persistedNote.content)}</div>
              </div>

              {hasItems(persistedNote.notableQuotes) ? (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">印象に残った発言</p>
                  {renderSummaryBullets(persistedNote.notableQuotes, '印象に残った発言はありません。', 'highlight')}
                </div>
              ) : null}
            </section>

            <aside>
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-stone-900">次の行動</h3>

                {hasItems(persistedNote.nextActions) ? (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">次に試したいこと</p>
                    {renderSummaryBullets(persistedNote.nextActions, '次に試したいことはありません。')}
                  </div>
                ) : null}

                {hasItems(persistedNote.nextQuestions) ? (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">次回確認したいこと</p>
                    {renderSummaryBullets(persistedNote.nextQuestions, '次回確認したいことはありません。')}
                  </div>
                ) : null}
              </section>
            </aside>
          </section>

          {hasItems(persistedNote.changesSincePrevious) || hasItems(persistedNote.insights) ? (
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              {hasItems(persistedNote.changesSincePrevious) ? (
                <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-stone-900">前回からの変化</h3>
                  {renderSummaryBullets(persistedNote.changesSincePrevious, '前回からの変化はありません。')}
                </section>
              ) : null}

              {hasItems(persistedNote.insights) ? (
                <section className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-stone-900">気づき</h3>
                  {renderSummaryBullets(persistedNote.insights, '気づきはありません。')}
                </section>
              ) : null}
            </section>
          ) : null}

          {hasItems(persistedNote.continuingThemes) || hasItems(persistedNote.newThemes) ? (
            <section className="grid gap-6 lg:grid-cols-2">
              {hasItems(persistedNote.continuingThemes) ? (
                <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-stone-900">継続テーマ</h3>
                  {renderSummaryBullets(persistedNote.continuingThemes, '継続テーマはありません。')}
                </section>
              ) : null}

              {hasItems(persistedNote.newThemes) ? (
                <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-stone-900">新規テーマ</h3>
                  {renderSummaryBullets(persistedNote.newThemes, '新規テーマはありません。')}
                </section>
              ) : null}
            </section>
          ) : null}

          {(relatedTargetNotes.length > 0 || relatedContextNotes.length > 0) ? (
            <section className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">関連情報</h3>
                <p className="mt-1 text-sm text-stone-500">必要になったら、今回使った対象メモや参照した過去まとめへ戻れます。</p>
              </div>

              {relatedTargetNotes.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">対象メモ</h4>
                  <div className="space-y-3">
                    {relatedTargetNotes.map((targetNote) => (
                      <button
                        key={targetNote.id}
                        type="button"
                        onClick={() => navigate(`/ai-journal/notes/${targetNote.id}`)}
                        className="flex w-full items-start justify-between rounded-2xl border border-stone-200 px-4 py-4 text-left transition-colors hover:bg-stone-50"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">{formatAiNoteTypeLabel(targetNote.type)}</span>
                            <p className="font-medium text-stone-900">{targetNote.title || '(無題)'}</p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{resolveLinkedNotePreview(targetNote)}</p>
                        </div>
                        <p className="ml-4 shrink-0 text-xs text-stone-400">{formatDateTime(targetNote.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {relatedContextNotes.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">参照した過去まとめ</h4>
                  <div className="space-y-3">
                    {relatedContextNotes.map((contextNote) => (
                      <button
                        key={contextNote.id}
                        type="button"
                        onClick={() => navigate(`/ai-journal/notes/${contextNote.id}`)}
                        className="flex w-full items-start justify-between rounded-2xl border border-stone-200 px-4 py-4 text-left transition-colors hover:bg-stone-50"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-2 py-1 text-[11px] text-sky-700">1on1サマリ</span>
                            <p className="font-medium text-stone-900">{contextNote.title || '(無題)'}</p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">{resolveLinkedNotePreview(contextNote)}</p>
                        </div>
                        <p className="ml-4 shrink-0 text-xs text-stone-400">{formatDateTime(contextNote.updatedAt)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}

      {persistedNote.type !== 'OneOnOneSummary' ? (
        <section className="space-y-6">
          {isJournalNote ? (
            <section className="mx-auto w-full max-w-5xl space-y-5">
              <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/90 px-6 py-6">
                <label className="block">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">タイトル</span>
                  <div className="group mt-2 flex items-center gap-3 border-b border-transparent pb-1 transition-colors hover:border-stone-200 focus-within:border-amber-300">
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      placeholder="今日のタイトルをつける"
                      className="min-w-0 flex-1 border-none bg-transparent p-0 text-lg font-medium text-stone-900 outline-none placeholder:text-stone-400"
                    />
                    <PencilLine className="h-4 w-4 shrink-0 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                  </div>
                </label>

                <div className="mt-5 flex flex-wrap gap-2">
                  {JOURNAL_PROMPT_CHIPS.map((promptLabel) => (
                    <button
                      key={promptLabel}
                      type="button"
                      onClick={() => handleInsertJournalPrompt(promptLabel)}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100"
                    >
                      {promptLabel}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={'今日は何がありましたか？\n気になったこと、あとで1on1で話したいことを書いておく'}
                    className="min-h-[540px] w-full resize-y rounded-[1.5rem] border border-stone-200 bg-[#fffefb] px-5 py-5 text-[15.5px] leading-[1.9] text-stone-900 outline-none transition-colors placeholder:text-stone-500 focus:border-amber-300"
                  />
                </label>
              </div>

              {hasRelatedMeta ? (
                <details className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-stone-900">補助情報</summary>
                  <div className="mt-4 space-y-4 text-sm text-stone-600">
                    {persistedNote.oneOnOneRunIds.length > 0 ? (
                      <p>1on1利用履歴: {persistedNote.oneOnOneRunIds.length}件</p>
                    ) : null}
                    {persistedNote.relatedSummaryIds.length > 0 ? (
                      <p>関連まとめ: {persistedNote.relatedSummaryIds.length}件</p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </section>
          ) : isBookNote ? (
            <section className="mx-auto w-full max-w-5xl space-y-5">
              <div className="rounded-[1.75rem] border border-stone-200/80 bg-white/90 px-6 py-6">
                <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    {bookDraft.readingFinishedOn ? '読了' : bookDraft.readingStartedOn ? '読書中' : '積読'}
                  </span>
                  {bookDraft.author ? <span>{bookDraft.author}</span> : null}
                  {bookDraft.readingStartedOn ? <span>開始 {bookDraft.readingStartedOn}</span> : null}
                  {bookDraft.readingFinishedOn ? <span>読了 {bookDraft.readingFinishedOn}</span> : null}
                </div>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">ノートタイトル</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="読書メモ"
                    className="mt-2 w-full border-none bg-transparent p-0 text-lg font-medium text-stone-900 outline-none"
                  />
                </label>

                <div className="mt-5 flex flex-wrap gap-2">
                  {BOOK_PROMPT_CHIPS.map((promptLabel) => (
                    <button
                      key={promptLabel}
                      type="button"
                      onClick={() => handleInsertBookPrompt(promptLabel)}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100"
                    >
                      {promptLabel}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder={'印象に残ったこと、考えたこと、1on1で話したいことを書く\n\n・印象に残った箇所\n・自分の仕事や生活に使えそうなこと\n・読みながら浮かんだ問い'}
                    className="min-h-[520px] w-full resize-y rounded-[1.5rem] border border-stone-200 bg-[#fffefb] px-5 py-5 text-[15.5px] leading-[1.9] text-stone-900 outline-none transition-colors placeholder:text-stone-500 focus:border-emerald-300"
                  />
                </label>
              </div>

              <details className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
                <summary className="cursor-pointer list-none text-sm font-medium text-stone-900">書籍情報を補完</summary>
                <p className="mt-2 text-sm text-stone-500">タイトルやメモからChatGPTで書籍情報を補完できます。初回作成時の補助として使います。</p>

                <div className="mt-4 space-y-5">
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-stone-900">書籍情報</h4>
                        <p className="text-sm text-stone-500">書籍名や著者が分かる範囲で入力し、必要ならあとで補完します。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSaveBookProperties()}
                        disabled={saving || !isBookDirty}
                        className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        書籍情報を保存
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">書籍名</span>
                        <input
                          value={bookDraft.officialTitle}
                          onChange={(event) => setBookDraft((current) => ({ ...current, officialTitle: event.target.value }))}
                          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">著者</span>
                        <input
                          value={bookDraft.author}
                          onChange={(event) => setBookDraft((current) => ({ ...current, author: event.target.value }))}
                          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">読書開始日</span>
                        <input
                          type="date"
                          value={bookDraft.readingStartedOn}
                          onChange={(event) => setBookDraft((current) => ({ ...current, readingStartedOn: event.target.value }))}
                          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none"
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-stone-700">読了日</span>
                        <input
                          type="date"
                          value={bookDraft.readingFinishedOn}
                          onChange={(event) => setBookDraft((current) => ({ ...current, readingFinishedOn: event.target.value }))}
                          className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-900">書籍情報を補完</p>
                        <p className="text-sm text-stone-500">タイトルやメモから正確な書籍情報への補完・訂正を依頼します。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyBookPrompt()}
                        className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                      >
                        <Copy className="h-4 w-4" />
                        プロンプトをコピー
                      </button>
                    </div>
                    <textarea
                      value={bookPromptText}
                      readOnly
                      className="min-h-[200px] w-full rounded-3xl border border-stone-300 px-4 py-4 text-sm leading-6 text-stone-900 outline-none"
                    />
                    {bookPromptCopyStatus === 'copied' ? <p className="text-xs text-emerald-700">クリップボードへコピーしました。</p> : null}
                    {bookPromptCopyStatus === 'failed' ? <p className="text-xs text-rose-700">コピーに失敗しました。</p> : null}
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-emerald-700" />
                      <p className="text-sm font-medium text-stone-900">JSONを取り込む</p>
                    </div>
                    <textarea
                      value={bookRawJson}
                      onChange={(event) => setBookRawJson(event.target.value)}
                      placeholder='{"schemaVersion":"1.0","type":"bookProperties",...}'
                      className="min-h-[160px] w-full rounded-3xl border border-stone-300 px-4 py-4 text-sm leading-6 text-stone-900 outline-none"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleImportBookJson()}
                        disabled={saving || bookRawJson.trim().length === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload className="h-4 w-4" />
                        JSONを取り込む
                      </button>
                    </div>
                    {bookImportMessage ? <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">{bookImportMessage}</p> : null}
                  </section>
                </div>
              </details>

              {hasRelatedMeta ? (
                <details className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-stone-900">補助情報</summary>
                  <div className="mt-4 space-y-4 text-sm text-stone-600">
                    {persistedNote.oneOnOneRunIds.length > 0 ? <p>1on1利用履歴: {persistedNote.oneOnOneRunIds.length}件</p> : null}
                    {persistedNote.relatedSummaryIds.length > 0 ? <p>関連まとめ: {persistedNote.relatedSummaryIds.length}件</p> : null}
                  </div>
                </details>
              ) : null}
            </section>
          ) : (
            <div className="space-y-4 rounded-[1.75rem] border border-stone-200/80 bg-white/90 p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">タイトル</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-amber-400"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-stone-700">種別</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as (typeof AI_NOTE_TYPE_ORDER)[number])}
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition-colors focus:border-amber-400"
                  >
                    {EDITABLE_NOTE_TYPES.map((noteType) => (
                      <option key={noteType} value={noteType}>
                        {formatAiNoteTypeLabel(noteType)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-stone-700">本文</span>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[420px] w-full rounded-3xl border border-stone-300 px-4 py-4 text-sm leading-7 text-stone-900 outline-none transition-colors focus:border-amber-400"
                />
              </label>
            </div>
          )}

          {!isJournalNote && hasRelatedMeta ? (
            <details className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-medium text-stone-900">補助情報</summary>
              <div className="mt-4 space-y-3 text-sm text-stone-600">
                {persistedNote.oneOnOneRunIds.length > 0 ? <p>1on1利用履歴: {persistedNote.oneOnOneRunIds.length}件</p> : null}
                {persistedNote.relatedSummaryIds.length > 0 ? <p>関連まとめ: {persistedNote.relatedSummaryIds.length}件</p> : null}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
