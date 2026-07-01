import { Link } from 'react-router-dom';

export default function EntryPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center">
      <div className="grid w-full gap-6 md:grid-cols-3">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">TODO Management</p>
          <h2 className="mt-4 font-serif text-3xl text-stone-800">TODO管理</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            今日、近日予定、ラベルでタスクを整理する個人向けTODO管理です。
          </p>
          <Link
            to="/todo"
            className="mt-8 inline-flex rounded-2xl bg-stone-800 px-5 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700"
          >
            TODO管理を開く
          </Link>
        </section>

        <section className="rounded-3xl border border-sky-200 bg-sky-50/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Reflect Journal</p>
          <h2 className="mt-4 font-serif text-3xl text-slate-900">Reflect Journal</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            きっかけと自由記述だけを軽く保存し、ChatGPT で思考振り返りJSONを生成して取り込むPoCです。
          </p>
          <Link
            to="/v2/home"
            className="mt-8 inline-flex rounded-2xl bg-sky-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            Reflect Journalを開く
          </Link>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">AI Journal & 1on1</p>
          <h2 className="mt-4 font-serif text-3xl text-stone-900">AIジャーナル・1on1</h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            ノートを分類して蓄積し、1on1用プロンプト生成と結果JSON取込を行う新機能です。
          </p>
          <Link
            to="/ai-journal/home"
            className="mt-8 inline-flex rounded-2xl bg-amber-700 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            AIジャーナル・1on1を開く
          </Link>
        </section>
      </div>
    </div>
  );
}
