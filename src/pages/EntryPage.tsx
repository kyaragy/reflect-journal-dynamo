import { Link } from 'react-router-dom';

export default function EntryPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center">
      <div className="grid w-full gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">Legacy</p>
          <h2 className="mt-4 font-serif text-3xl text-stone-800">旧版</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            きっかけと複数カードを積み上げる既存フローです。現行利用を維持しながら、そのまま使えます。
          </p>
          <Link
            to="/calendar"
            className="mt-8 inline-flex rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700"
          >
            旧版を開く
          </Link>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-sky-50/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Thinking PoC</p>
          <h2 className="mt-4 font-serif text-3xl text-slate-900">新版</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            きっかけと自由記述だけを軽く保存し、ChatGPT で思考振り返りJSONを生成して取り込むPoCです。
          </p>
          <Link
            to="/v2/calendar"
            className="mt-8 inline-flex rounded-2xl bg-sky-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            新版を開く
          </Link>
        </section>
      </div>
    </div>
  );
}
