import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

type SearchHit = {
  date: string;
  entryId: string;
  body: string;
  tags?: string[];
  mood?: string;
  createdAt: string;
};

export default function V2SearchPage() {
  const navigate = useNavigate();
  const days = useThinkingReflectionStore((state) => state.days);
  const [query, setQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [mood, setMood] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tag = tagQuery.trim().replace(/^#/, '').toLowerCase();

    const collected: SearchHit[] = [];
    days.forEach((day) => {
      if (fromDate && day.date < fromDate) {
        return;
      }
      if (toDate && day.date > toDate) {
        return;
      }

      day.entries.forEach((entry) => {
        if (q && !entry.body.toLowerCase().includes(q)) {
          return;
        }
        if (tag && !entry.tags?.some((item) => item.toLowerCase().includes(tag))) {
          return;
        }
        if (mood && entry.mood !== mood) {
          return;
        }
        collected.push({
          date: day.date,
          entryId: entry.id,
          body: entry.body,
          tags: entry.tags,
          mood: entry.mood,
          createdAt: entry.createdAt,
        });
      });
    });

    return collected.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [days, fromDate, mood, query, tagQuery, toDate]);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/v2/home')} className="flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        ホームへ戻る
      </button>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-stone-600" />
          <h2 className="font-serif text-3xl text-stone-900">検索</h2>
        </div>
        <p className="mt-2 text-sm text-stone-600">本文、タグ、mood、日付で記録を絞り込みます。</p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="本文で検索"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <input
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            placeholder="タグで検索（例: 仕事）"
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <select
            value={mood}
            onChange={(event) => setMood(event.target.value)}
            className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">mood指定なし</option>
            <option value="😀">😀</option>
            <option value="😐">😐</option>
            <option value="😡">😡</option>
            <option value="😢">😢</option>
            <option value="😴">😴</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-stone-500">{hits.length}件</p>
        {hits.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
            条件に一致する記録がありません。
          </div>
        ) : null}
        {hits.map((hit) => (
          <article key={hit.entryId} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-stone-500">{hit.date}</p>
              <button
                type="button"
                onClick={() => navigate(`/v2/day/${hit.date}`)}
                className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
              >
                日次を開く
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{hit.body}</p>
            {hit.tags?.length ? <p className="mt-2 text-xs text-stone-500">{hit.tags.map((tag) => `${tag}`).join(' ')}</p> : null}
            {hit.mood ? <p className="mt-1 text-xs text-stone-500">mood: {hit.mood}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
}

