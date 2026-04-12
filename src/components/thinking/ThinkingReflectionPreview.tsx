import { Brain, Lightbulb, MessageCircleQuestion, Sparkles } from 'lucide-react';
import type { ThinkingMemoCard, ThinkingReflectionResult } from '../../domain/thinkingReflection';

type Props = {
  reflection: ThinkingReflectionResult;
  memoCards: ThinkingMemoCard[];
  questionResponses?: Record<string, string>;
  onQuestionSelect?: (question: string) => void;
};

type SummaryPanelProps = {
  title: string;
  subtitle: string;
  icon: typeof Brain;
  tone: 'sky' | 'amber' | 'rose';
  items: string[];
  ordered?: boolean;
};

const toneStyles: Record<SummaryPanelProps['tone'], { shell: string; icon: string; badge: string; item: string }> = {
  sky: {
    shell: 'border-sky-200/80 bg-linear-to-br from-sky-50 via-white to-cyan-50',
    icon: 'bg-sky-100 text-sky-700',
    badge: 'text-sky-600',
    item: 'border-sky-100 bg-white/90 text-sky-900',
  },
  amber: {
    shell: 'border-amber-200/80 bg-linear-to-br from-amber-50 via-white to-orange-50',
    icon: 'bg-amber-100 text-amber-700',
    badge: 'text-amber-600',
    item: 'border-amber-100 bg-white/90 text-amber-900',
  },
  rose: {
    shell: 'border-rose-200/80 bg-linear-to-br from-rose-50 via-white to-fuchsia-50',
    icon: 'bg-rose-100 text-rose-700',
    badge: 'text-rose-600',
    item: 'border-rose-100 bg-white/90 text-rose-900',
  },
};

function SummaryPanel({ title, subtitle, icon: Icon, tone, items, ordered = false }: SummaryPanelProps) {
  const styles = toneStyles[tone];

  return (
    <section className={['rounded-[2rem] border p-5 shadow-sm', styles.shell].join(' ')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={['text-[11px] font-semibold uppercase tracking-[0.24em]', styles.badge].join(' ')}>{subtitle}</p>
          <h3 className="mt-2 text-lg font-semibold text-stone-950">{title}</h3>
        </div>
        <div className={['flex h-11 w-11 items-center justify-center rounded-2xl', styles.icon].join(' ')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={item} className={['rounded-2xl border px-4 py-3 shadow-sm', styles.item].join(' ')}>
            <div className="flex items-start gap-3">
              <div className={['mt-0.5 text-xs font-semibold', styles.badge].join(' ')}>
                {ordered ? `${index + 1}.` : `${String(index + 1).padStart(2, '0')}`}
              </div>
              <p className="text-sm leading-7">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReflectionList({ title, items, tone }: { title: string; items: string[]; tone: 'sky' | 'amber' | 'rose' }) {
  const badgeClass =
    tone === 'sky'
      ? 'bg-sky-100 text-sky-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <span className={['rounded-full px-2.5 py-1 text-[11px] font-semibold', badgeClass].join(' ')}>{items.length}件</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-white px-3 py-2.5 text-sm leading-7 text-stone-700 shadow-sm">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ThinkingReflectionPreview({ reflection, memoCards, questionResponses = {}, onQuestionSelect }: Props) {
  const memoCardMap = new Map(memoCards.map((card) => [card.id, card]));

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <SummaryPanel
          title="1日全体の傾向"
          subtitle="Patterns"
          icon={Sparkles}
          tone="sky"
          items={reflection.daily_patterns}
        />
        <SummaryPanel
          title="気づき候補"
          subtitle="Insights"
          icon={Lightbulb}
          tone="amber"
          items={reflection.insight_candidates}
        />
        <SummaryPanel
          title="問い"
          subtitle="Questions"
          icon={MessageCircleQuestion}
          tone="rose"
          items={reflection.questions}
          ordered
        />
      </section>

      {reflection.questions.length > 0 && onQuestionSelect ? (
        <section className="rounded-[2rem] border border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600">Responses</p>
              <h3 className="mt-2 text-lg font-semibold text-stone-950">問いへの追記</h3>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {reflection.questions.map((question) => {
              const response = questionResponses[question] ?? '';
              return (
                <div key={question} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium leading-7 text-amber-950">{question}</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    {response ? response : 'まだ追記がありません。'}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onQuestionSelect(question)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      {response ? '追記を編集' : '追記する'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {reflection.cards.map((card) => {
          const sourceCard = memoCardMap.get(card.card_id);

          return (
            <article key={card.card_id} className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 bg-linear-to-r from-stone-50 via-white to-stone-50 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">元カード</p>
                <h4 className="mt-2 text-xl font-medium text-stone-950">{card.trigger}</h4>
                {sourceCard ? <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-stone-600">{sourceCard.body}</p> : null}
              </div>

              <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                <ReflectionList title="思考" items={card.thoughts} tone="sky" />
                <ReflectionList title="感情" items={card.emotions} tone="rose" />
                <ReflectionList title="身体反応" items={card.body_reactions} tone="amber" />
                <ReflectionList title="行動" items={card.actions} tone="sky" />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
