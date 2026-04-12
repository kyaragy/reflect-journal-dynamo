import { useMemo, useState } from 'react';
import type { ThinkingMemoCard, ThinkingReflectionResult } from '../../domain/thinkingReflection';
import { parseThinkingReflectionImport } from '../../lib/thinkingReflectionImport';
import ThinkingReflectionPreview from './ThinkingReflectionPreview';

type Props = {
  date: string;
  memoCards: ThinkingMemoCard[];
  saving: boolean;
  onClose: () => void;
  onSave: (reflection: ThinkingReflectionResult) => Promise<void>;
};

export default function ThinkingImportModal({ date, memoCards, saving, onClose, onSave }: Props) {
  const [rawInput, setRawInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => {
    if (!rawInput.trim()) {
      return { reflection: null as ThinkingReflectionResult | null, error: null as string | null };
    }

    try {
      return {
        reflection: parseThinkingReflectionImport(rawInput, date, memoCards),
        error: null,
      };
    } catch (error) {
      return {
        reflection: null,
        error: error instanceof Error ? error.message : 'JSONの解析に失敗しました',
      };
    }
  }, [date, memoCards, rawInput]);

  const handleSave = async () => {
    setSubmitted(true);
    if (!parsed.reflection) {
      return;
    }

    await onSave(parsed.reflection);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 px-4 py-6">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-auto rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">思考振り返りJSONを取り込む</h3>
            <p className="mt-1 text-sm text-stone-500">ChatGPTの返却値を貼り付けると、保存前にプレビューできます。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
          >
            閉じる
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <section className="space-y-3">
            <label className="text-sm font-medium text-stone-700">JSON または JSONコードブロック</label>
            <textarea
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              className="min-h-[360px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-mono text-sm leading-7 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder='```json\n{\n  "date": "2026-04-10",\n  ...\n}\n```'
            />
            {submitted && parsed.error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{parsed.error}</p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving || !parsed.reflection}
                onClick={handleSave}
                className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                {saving ? '保存中...' : 'この内容で保存'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-stone-800">保存前プレビュー</h4>
            <div className="mt-4">
              {parsed.reflection ? (
                <ThinkingReflectionPreview reflection={parsed.reflection} memoCards={memoCards} />
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-12 text-center text-sm text-stone-400">
                  有効なJSONを貼り付けるとプレビューを表示します。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
