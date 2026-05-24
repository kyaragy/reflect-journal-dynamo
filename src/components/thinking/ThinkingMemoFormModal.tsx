import { useState } from 'react';
import type { FormEvent } from 'react';

type Props = {
  onClose: () => void;
  onSave: (input: { trigger?: string; body: string; tags?: string[]; mood?: string }) => Promise<void>;
  saving: boolean;
  initialValue?: {
    trigger?: string;
    body: string;
    tags?: string[];
    mood?: string;
  };
  mode?: 'create' | 'edit';
  saveDate?: string;
  onSaveDateChange?: (date: string) => void;
  existingTags?: string[];
};

export default function ThinkingMemoFormModal({
  onClose,
  onSave,
  saving,
  initialValue,
  mode = 'create',
  saveDate,
  onSaveDateChange,
  existingTags = [],
}: Props) {
  const [body, setBody] = useState(initialValue?.body ?? '');
  const [trigger, setTrigger] = useState(initialValue?.trigger ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(Array.from(new Set((initialValue?.tags ?? []).map((tag) => tag.trim()).filter(Boolean))));
  const [newTagName, setNewTagName] = useState('');
  const [mood, setMood] = useState(initialValue?.mood ?? '');

  const normalizeTag = (value: string) => value.trim().replace(/^#/, '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({
      trigger: trigger.trim() || undefined,
      body,
      tags: selectedTags.length ? Array.from(new Set(selectedTags)) : undefined,
      mood: mood || undefined,
    });
    if (mode === 'create') {
      setTrigger('');
      setBody('');
      setSelectedTags([]);
      setNewTagName('');
      setMood('');
    }
  };

  const addTag = (rawTag: string) => {
    const tag = normalizeTag(rawTag);
    if (!tag) {
      return;
    }
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((item) => item !== tag));
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:px-4">
      <div className="max-h-[95dvh] w-full max-w-6xl overflow-y-auto rounded-t-3xl border border-stone-200 bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">{mode === 'edit' ? '新版の記録を編集' : '新版の記録を追加'}</h3>
            <p className="mt-1 text-base text-stone-500">分類は後で行うため、この画面では自由記述だけを保存します。</p>
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
            <label className="text-base font-medium text-stone-700">きっかけ（任意）</label>
            <textarea
              value={trigger}
              onChange={(event) => setTrigger(event.target.value)}
              placeholder="何が起点でこの記録を書こうと思ったか"
              className="min-h-[100px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-base leading-8 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-stone-700">自由記述</label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={`今日のことを書く...

イライラしたこと
嬉しかったこと
考えたこと
なんでもOK`}
              className="min-h-[420px] w-full rounded-2xl border border-stone-200 px-4 py-3 text-base leading-8 text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-stone-700">タグ（任意）</label>
            {selectedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 rounded-md bg-stone-200 px-2 py-1 text-sm text-stone-700 hover:brightness-95"
                  >
                    {tag}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}
            {existingTags.length > 0 ? (
              <select
                value=""
                onChange={(event) => {
                  if (!event.target.value) {
                    return;
                  }
                  addTag(event.target.value);
                }}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">既存タグから追加</option>
                {existingTags
                  .filter((tag) => !selectedTags.includes(tag))
                  .map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
              </select>
            ) : null}
            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }
                  event.preventDefault();
                  addTag(newTagName);
                  setNewTagName('');
                }}
                placeholder="新しいタグ"
                className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={() => {
                  addTag(newTagName);
                  setNewTagName('');
                }}
                className="rounded-2xl bg-stone-800 px-4 py-3 text-base text-white transition-colors hover:bg-stone-700"
              >
                追加
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-stone-700">mood（任意）</label>
            <div className="flex flex-wrap gap-2">
              {['😀', '😐', '😡', '😢', '😴'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMood((current) => (current === item ? '' : item))}
                  className={[
                    'rounded-xl border px-3 py-2 text-lg',
                    mood === item ? 'border-sky-300 bg-sky-50' : 'border-stone-200 bg-white hover:bg-stone-50',
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {saveDate !== undefined && onSaveDateChange ? (
            <div className="space-y-2">
              <label className="text-base font-medium text-stone-700">保存先日付</label>
              <input
                type="date"
                value={saveDate}
                onChange={(event) => onSaveDateChange(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          ) : null}

          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-base leading-8 text-stone-600">
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
              disabled={saving || !body.trim()}
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
