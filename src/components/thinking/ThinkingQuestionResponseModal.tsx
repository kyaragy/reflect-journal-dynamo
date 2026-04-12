import { useState } from 'react';

type Props = {
  question: string;
  initialResponse: string;
  saving: boolean;
  onClose: () => void;
  onSave: (response: string) => Promise<void>;
};

export default function ThinkingQuestionResponseModal({
  question,
  initialResponse,
  saving,
  onClose,
  onSave,
}: Props) {
  const [response, setResponse] = useState(initialResponse);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-amber-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600">Reflection Response</p>
            <h3 className="mt-2 text-xl font-semibold text-stone-950">問いへの追記</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
          >
            閉じる
          </button>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4">
          <p className="text-sm font-medium leading-7 text-amber-950">{question}</p>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium text-stone-700">自分の答えや今の仮説</label>
          <textarea
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            className="mt-2 min-h-[240px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-7 text-stone-800 outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            placeholder="この問いに対して、今の考えを書いてください。"
          />
          <p className="mt-2 text-xs text-stone-400">この追記は通常のメモカードや ChatGPT 用出力には含めません。</p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(response)}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-400 disabled:opacity-60"
          >
            {saving ? '保存中...' : '追記を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
