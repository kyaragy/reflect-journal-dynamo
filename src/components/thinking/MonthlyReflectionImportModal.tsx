import { useMemo, useState } from 'react';
import type { MonthlyReflectionResult, ThinkingWeekRecord } from '../../domain/thinkingReflection';
import { parseMonthlyReflectionImport } from '../../lib/monthlyReflectionImport';
import MonthlyReflectionPreview from './MonthlyReflectionPreview';

type Props = {
  monthKey: string;
  sourceWeeks: ThinkingWeekRecord[];
  saving: boolean;
  onClose: () => void;
  onSave: (reflection: MonthlyReflectionResult) => Promise<void>;
};

export default function MonthlyReflectionImportModal({ monthKey, sourceWeeks, saving, onClose, onSave }: Props) {
  const [rawInput, setRawInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const parsed = useMemo(() => {
    if (!rawInput.trim()) {
      return { reflection: null as MonthlyReflectionResult | null, error: null as string | null };
    }

    try {
      return {
        reflection: parseMonthlyReflectionImport(rawInput, monthKey, sourceWeeks),
        error: null,
      };
    } catch (error) {
      return {
        reflection: null,
        error: error instanceof Error ? error.message : 'JSONの解析に失敗しました',
      };
    }
  }, [monthKey, rawInput, sourceWeeks]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 px-4 py-6">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-auto rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">月次JSONを取り込む</h3>
            <p className="mt-1 text-sm text-stone-500">ChatGPTの返却JSONを貼り付けて、保存前に月次プレビューを確認します。</p>
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
            />
            {submitted && parsed.error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{parsed.error}</p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving || !parsed.reflection}
                onClick={async () => {
                  setSubmitted(true);
                  if (!parsed.reflection) {
                    return;
                  }
                  await onSave(parsed.reflection);
                }}
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
                <MonthlyReflectionPreview reflection={parsed.reflection} sourceWeeks={sourceWeeks} />
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-12 text-center text-sm text-stone-400">
                  有効な月次JSONを貼り付けるとプレビューを表示します。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
