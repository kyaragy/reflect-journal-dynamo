import { format, startOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, Clock3, Search, Sparkles } from 'lucide-react';

export default function V2HomePage() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-sky-200 bg-sky-50/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Life Log Home</p>
        <h2 className="mt-2 font-serif text-3xl text-slate-900">記録の入口</h2>
        <p className="mt-2 text-sm text-slate-700">まずは今日を書く。必要なときに過去を見返して、ふりかえりにつなげます。</p>
      </section>

      <section className="grid gap-4">
        <button
          type="button"
          onClick={() => navigate(`/v2/day/${today}`)}
          className="flex items-center justify-between rounded-3xl border border-sky-300 bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-sky-50"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Write Today</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">今日の入力</p>
          </div>
          <Sparkles className="h-5 w-5 text-sky-600" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/v2/calendar')}
          className="flex items-center justify-between rounded-3xl border border-stone-200 bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-stone-50"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Browse Logs</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">最近の情報を見る</p>
            <p className="mt-1 text-xs text-stone-500">日ごとの閲覧（左右移動）と月カレンダージャンプ</p>
          </div>
          <Clock3 className="h-5 w-5 text-stone-600" />
        </button>

        <button
          type="button"
          onClick={() => navigate(`/v2/week/${weekStart}/thinking`)}
          className="flex items-center justify-between rounded-3xl border border-amber-200 bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-amber-50"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Reflection</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">ふりかえり</p>
          </div>
          <CalendarRange className="h-5 w-5 text-amber-700" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/v2/search')}
          className="flex items-center justify-between rounded-3xl border border-emerald-200 bg-white px-5 py-5 text-left shadow-sm transition-colors hover:bg-emerald-50"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Search</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">検索</p>
          </div>
          <Search className="h-5 w-5 text-emerald-700" />
        </button>
      </section>
    </div>
  );
}
