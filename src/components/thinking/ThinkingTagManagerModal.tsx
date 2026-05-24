import { useMemo, useState } from 'react';
import type { ThinkingDayRecord } from '../../domain/thinkingReflection';

type Props = {
  days: ThinkingDayRecord[];
  saving: boolean;
  onClose: () => void;
  onRenameTag: (from: string, to: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
};

export default function ThinkingTagManagerModal({ days, saving, onClose, onRenameTag, onDeleteTag }: Props) {
  const [selectedTag, setSelectedTag] = useState('');
  const [renameTo, setRenameTo] = useState('');

  const tagStats = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((day) => {
      day.entries.forEach((entry) => {
        (entry.tags ?? []).forEach((tag) => {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        });
      });
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [days]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-medium text-stone-900">タグ管理</h3>
            <p className="mt-1 text-sm text-stone-500">既存タグの名称変更と削除ができます。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100"
          >
            閉じる
          </button>
        </div>

        <div className="space-y-4">
          <select
            value={selectedTag}
            onChange={(event) => {
              setSelectedTag(event.target.value);
              setRenameTo(event.target.value);
            }}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">タグを選択</option>
            {tagStats.map((item) => (
              <option key={item.tag} value={item.tag}>
                {item.tag} ({item.count})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              value={renameTo}
              onChange={(event) => setRenameTo(event.target.value)}
              placeholder="変更後タグ名"
              className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="button"
              disabled={saving || !selectedTag || !renameTo.trim() || selectedTag === renameTo.trim()}
              onClick={async () => {
                await onRenameTag(selectedTag, renameTo.trim());
                setSelectedTag('');
                setRenameTo('');
              }}
              className="rounded-2xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
            >
              名前変更
            </button>
          </div>

          <button
            type="button"
            disabled={saving || !selectedTag}
            onClick={async () => {
              await onDeleteTag(selectedTag);
              setSelectedTag('');
              setRenameTo('');
            }}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
          >
            選択タグを削除
          </button>
        </div>
      </div>
    </div>
  );
}
