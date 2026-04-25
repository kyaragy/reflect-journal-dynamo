import { ChevronDown, Lightbulb, Repeat2, Sparkles, TrendingUp } from 'lucide-react';
import type { MonthlyReflectionResult, ThinkingWeekRecord } from '../../domain/thinkingReflection';

type Props = {
  reflection: MonthlyReflectionResult;
  sourceWeeks: ThinkingWeekRecord[];
};

function SectionCard({ title, items, icon: Icon }: { title: string; items: string[]; icon: typeof Sparkles }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function MonthlyReflectionPreview({ reflection, sourceWeeks }: Props) {
  const sourceWeekMap = new Map(sourceWeeks.map((week) => [week.weekStart, week]));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Monthly Summary</p>
        <h3 className="mt-3 text-2xl font-semibold text-stone-950">今月の要約</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-stone-700">{reflection.monthly_summary}</p>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Repeat2 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-stone-950">未改善で繰り返すパターン</h3>
        </div>
        <ul className="mt-4 space-y-2.5">
          {reflection.looping_patterns.map((item) => (
            <li key={item} className="rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-950">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="進展した気づき" items={reflection.evolving_insights} icon={TrendingUp} />
        <SectionCard title="新しく出たテーマ" items={reflection.new_patterns} icon={Sparkles} />
        <SectionCard title="弱まったパターン" items={reflection.resolved_or_reduced_patterns} icon={Lightbulb} />
        <SectionCard title="次月の観察観点" items={reflection.monthly_focus_points} icon={Lightbulb} />
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <ChevronDown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-950">元にした週次材料一覧</h3>
            <p className="text-sm text-stone-500">週次ふりかえりから月次の材料になった内容を展開して確認できます。</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {reflection.source_weeks.map((sourceWeek) => {
            const week = sourceWeekMap.get(sourceWeek.week_start);
            const weekly = week?.reflection;

            return (
              <details key={sourceWeek.week_start} className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-stone-900">
                  {sourceWeek.week_start} 〜 {sourceWeek.week_end}
                </summary>
                {weekly ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">weekly_summary</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{weekly.weekly_summary}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">repeated_patterns</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-700">
                        {weekly.repeated_patterns.map((item) => (
                          <li key={`${item.pattern}-${item.count}`}>{item.pattern} ({item.count}回)</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">notable_changes</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-700">
                        {weekly.notable_changes.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">該当する週次材料が見つかりません。</p>
                )}
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
