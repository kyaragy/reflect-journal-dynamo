import { useState } from 'react';
import type { FormEvent } from 'react';

type Props = {
  onClose: () => void;
  onSave: (input: { trigger: string; body: string }) => Promise<void>;
  saving: boolean;
  initialValue?: {
    trigger: string;
    body: string;
  };
  mode?: 'create' | 'edit';
  saveDate?: string;
  onSaveDateChange?: (date: string) => void;
};

export default function ThinkingMemoFormModal({
  onClose,
  onSave,
  saving,
  initialValue,
  mode = 'create',
  saveDate,
  onSaveDateChange,
}: Props) {
  const [trigger, setTrigger] = useState(initialValue?.trigger ?? '');
  const [body, setBody] = useState(initialValue?.body ?? '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({ trigger, body });
    if (mode === 'create') {
      setTrigger('');
      setBody('');
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:px-4">
      <div className="max-h-[95dvh] w-full max-w-6xl overflow-y-auto rounded-t-3xl border border-stone-200 bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">{mode === 'edit' ? '新版の記録を編集' : '新版の記録を追加'}</h3>
            <p className="mt-1 text-sm text-stone-500">分類は後で行うため、この画面では自由記述だけを保存します。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
          >
            閉じる
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">きっかけ</label>
            <input
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder="例: Teamsの通知が来た"
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">自由記述</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="思考・感情・身体反応・行動を分けずに、そのまま書いてください。"
              className="min-h-[240px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm leading-7 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {saveDate !== undefined && onSaveDateChange ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">保存先日付</label>
              <input
                type="date"
                value={saveDate}
                onChange={(event) => onSaveDateChange(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          ) : null}

          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-600">
            分類UI、AI途中介入、深掘り質問はここでは行いません。
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !trigger.trim() || !body.trim()}
              className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
            >
              {saving ? '保存中...' : mode === 'edit' ? '更新する' : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
