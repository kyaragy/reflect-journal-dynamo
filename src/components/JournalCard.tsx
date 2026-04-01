import React from 'react';
import { format } from 'date-fns';
import { Activity, ArrowRight, Brain, Heart, Edit2, Sparkles, Trash2 } from 'lucide-react';
import type { Card } from '../store/useJournalStore';
import { getStepTypeLabel, type StepType } from '../domain/journal';

interface JournalCardProps {
  entry: Card;
  onEdit?: (entry: Card) => void;
  onDelete?: (entry: Card) => void;
}

const stepIconMap: Record<StepType, typeof Brain> = {
  thought: Brain,
  emotion: Heart,
  action: ArrowRight,
  body: Activity,
};

const stepColorMap: Record<StepType, string> = {
  thought: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  emotion: 'border-rose-200 bg-rose-50 text-rose-700',
  action: 'border-amber-200 bg-amber-50 text-amber-700',
  body: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const stepSectionClassMap: Record<StepType, string> = {
  thought: 'border-indigo-100 bg-indigo-50/55',
  emotion: 'border-rose-100 bg-rose-50/55',
  action: 'border-amber-100 bg-amber-50/60',
  body: 'border-emerald-100 bg-emerald-50/55',
};

const stepNumberClassMap: Record<StepType, string> = {
  thought: 'bg-indigo-100 text-indigo-700',
  emotion: 'bg-rose-100 text-rose-700',
  action: 'bg-amber-100 text-amber-700',
  body: 'bg-emerald-100 text-emerald-700',
};

const JournalCard: React.FC<JournalCardProps> = ({ entry, onEdit, onDelete }) => {
  const createdAt = new Date(entry.createdAt);
  const time = Number.isNaN(createdAt.getTime())
    ? format(new Date(), 'HH:mm')
    : new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      }).format(createdAt);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/60 relative overflow-hidden group">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          {entry.tag ? (
            <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
              {entry.tag}
            </span>
          ) : null}
          <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">{time}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            {onEdit ? (
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                aria-label="記録を編集"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : null}
            {onDelete ? (
              <button
                onClick={() => onDelete(entry)}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                aria-label="記録を削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-600 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>きっかけ</span>
          </div>
          <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">
            {entry.trigger.content || '未入力'}
          </p>
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold text-stone-600">ステップ</div>
          {entry.steps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
              ステップはまだありません
            </div>
          ) : (
            entry.steps.map((step, index) => {
              const Icon = stepIconMap[step.type];
              return (
                <div
                  key={step.id}
                  className={['flex gap-3 rounded-2xl border p-4', stepSectionClassMap[step.type]].join(' ')}
                >
                  <div
                    className={[
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      stepNumberClassMap[step.type],
                    ].join(' ')}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                          stepColorMap[step.type],
                        ].join(' ')}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {getStepTypeLabel(step.type)}
                      </span>
                    </div>
                    <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">
                      {step.content || '未入力'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
};

export default React.memo(JournalCard, (prevProps, nextProps) => (
  prevProps.entry === nextProps.entry
  && prevProps.onEdit === nextProps.onEdit
  && prevProps.onDelete === nextProps.onDelete
));
