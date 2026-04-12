import { ChevronDown, Lightbulb, Repeat2, ScanSearch, Sparkles } from 'lucide-react';
import type { ThinkingDayRecord, WeeklyReflectionResult } from '../../domain/thinkingReflection';

type Props = {
  reflection: WeeklyReflectionResult;
  sourceDays: ThinkingDayRecord[];
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

export default function WeeklyReflectionPreview({ reflection, sourceDays }: Props) {
  const sourceDayMap = new Map(sourceDays.map((day) => [day.date, day]));

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-sky-200 bg-linear-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Weekly Summary</p>
        <h3 className="mt-3 text-2xl font-semibold text-stone-950">今週の要約</h3>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-stone-700">{reflection.weekly_summary}</p>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Repeat2 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-stone-950">繰り返しの傾向</h3>
        </div>
        <div className="mt-4 space-y-3">
          {reflection.repeated_patterns.map((item) => (
            <div key={`${item.pattern}-${item.count}`} className="flex items-center justify-between rounded-2xl bg-sky-50 px-4 py-3">
              <p className="text-sm leading-7 text-sky-950">{item.pattern}</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">{item.count}回</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="今週の変化" items={reflection.notable_changes} icon={Sparkles} />
        <SectionCard title="回答から見えた傾向" items={reflection.question_answer_patterns} icon={ScanSearch} />
        <SectionCard title="未回答に残りやすい問いの傾向" items={reflection.unanswered_question_patterns} icon={Lightbulb} />
        <SectionCard title="強まっている気づき" items={reflection.growing_insights} icon={Lightbulb} />
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <ChevronDown className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-stone-950">元にした日次材料一覧</h3>
            <p className="text-sm text-stone-500">日次ふりかえりから週次の材料になった内容を展開して確認できます。</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {reflection.source_days.map((sourceDay) => {
            const day = sourceDayMap.get(sourceDay.date);
            const daily = day?.thinkingReflection;
            const answerMemos = day?.questionResponses.map((item) => item.response).filter((item) => item.trim().length > 0) ?? [];

            return (
              <details key={sourceDay.date} className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-stone-900">
                  {sourceDay.date}
                </summary>
                {daily ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">daily_summary</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                        {daily.daily_patterns.join('\n')}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">insight_candidates</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-700">
                        {daily.insight_candidates.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">questions</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-700">
                        {daily.questions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">answer_memos</p>
                      <ul className="mt-2 space-y-2 text-sm leading-7 text-stone-700">
                        {answerMemos.length > 0 ? answerMemos.map((item) => <li key={item}>{item}</li>) : <li>なし</li>}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-stone-400">該当する日次材料が見つかりません。</p>
                )}
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
