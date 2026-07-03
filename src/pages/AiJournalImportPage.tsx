import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileJson, Upload } from 'lucide-react';
import { useAiJournalStore } from '../store/useAiJournalStore';
import { useOneOnOneStore } from '../store/useOneOnOneStore';

export default function AiJournalImportPage() {
  const navigate = useNavigate();
  const initialize = useOneOnOneStore((state) => state.initialize);
  const importSummaryJson = useOneOnOneStore((state) => state.importSummaryJson);
  const saving = useOneOnOneStore((state) => state.saving);
  const error = useOneOnOneStore((state) => state.error);
  const latestSummaryNoteId = useOneOnOneStore((state) => state.latestSummaryNoteId);
  const notes = useAiJournalStore((state) => state.notes);
  const initializeNotes = useAiJournalStore((state) => state.initialize);
  const [rawJson, setRawJson] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [importedSummaryId, setImportedSummaryId] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
    void initializeNotes();
  }, [initialize, initializeNotes]);

  const summaryNotes = useMemo(() => notes.filter((note) => note.type === 'OneOnOneSummary'), [notes]);

  const handleImport = async () => {
    setValidationMessage(null);
    setImportedSummaryId(null);

    try {
      const result = await importSummaryJson(rawJson);
      setValidationMessage('取込に成功しました。');
      setImportedSummaryId(result.summaryNoteId);
    } catch (importError) {
      setValidationMessage(importError instanceof Error ? importError.message : '取込に失敗しました。');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Import</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900">1on1結果取込</h2>
            <p className="mt-2 text-sm text-stone-700">ChatGPT の出力JSONを貼り付けて、1on1サマリノートを生成します。</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ai-journal/1on1')}
            className="inline-flex rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
          >
            1on1へ戻る
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-emerald-700" />
            <h3 className="text-lg font-semibold text-stone-900">JSON貼り付け</h3>
          </div>
          <textarea
            value={rawJson}
            onChange={(event) => setRawJson(event.target.value)}
            placeholder='{"schemaVersion":"1.0","type":"1on1Summary",...}'
            className="mt-4 min-h-[480px] w-full rounded-3xl border border-stone-300 px-4 py-4 text-sm leading-6 text-stone-900 outline-none transition-colors focus:border-emerald-400"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={saving || rawJson.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              取込
            </button>
            {importedSummaryId ? (
              <button
                type="button"
                onClick={() => navigate(`/ai-journal/notes/${importedSummaryId}`)}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                生成ノートを開く
              </button>
            ) : null}
          </div>
          {validationMessage ? (
            <p className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-700">{validationMessage}</p>
          ) : null}
          {error ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">既存の1on1サマリ</h3>
            <div className="mt-4 space-y-3">
              {summaryNotes.length === 0 ? (
                <p className="text-sm text-stone-500">まだ1on1サマリはありません。</p>
              ) : (
                summaryNotes.slice(0, 5).map((note) => (
                  <div key={note.id} className="rounded-2xl border border-stone-100 px-4 py-3">
                    <p className="font-medium text-stone-900">{note.title || '1on1まとめ'}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      対象 {note.targetNoteIds?.length ?? 0}件 / 参照 {note.contextSummaryIds?.length ?? 0}件
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-stone-900">バリデーション対象</h3>
            <ul className="mt-4 space-y-2 text-sm text-stone-600">
              <li>`schemaVersion` が `1.0` または `1.1`</li>
              <li>`type` が `1on1Summary`</li>
              <li>`targetNoteIds` / `contextSummaryIds` が既存ノートIDと一致</li>
              <li>Summary本文と配列項目が存在</li>
            </ul>
          </section>
        </aside>
      </section>

      {latestSummaryNoteId ? (
        <p className="text-sm text-stone-500">直近に生成した Summary ノート: {latestSummaryNoteId}</p>
      ) : null}
    </div>
  );
}
