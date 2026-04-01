import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Plus, Sparkles, Save, Copy, FileText, Check, ListTodo, Trash2 } from 'lucide-react';
import { useJournalStore, Card } from '../store/useJournalStore';
import JournalCard from '../components/JournalCard';
import JournalForm from '../components/JournalForm';
import { motion, AnimatePresence } from 'motion/react';
import { generateCardMarkdown } from '../lib/cardMarkdown';
import { getReflectionPlaceholder } from '../lib/reflectionPlaceholders';
import {
  dayActivityStatuses,
  getDayActivityStatusLabel,
  type CreateCardInput,
  type DayActivity,
  type DayActivityStatus,
} from '../domain/journal';

export default function DayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Card | null>(null);
  const [cardDraft, setCardDraft] = useState<CreateCardInput | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityStatus, setActivityStatus] = useState<DayActivityStatus>('pending');
  const [continuedActivityId, setContinuedActivityId] = useState<string | null>(null);
  
  const days = useJournalStore((state) => state.days);
  const saving = useJournalStore((state) => state.saving);
  const deleteEntry = useJournalStore((state) => state.deleteEntry);
  const addActivity = useJournalStore((state) => state.addActivity);
  const updateActivityStatus = useJournalStore((state) => state.updateActivityStatus);
  const deleteActivity = useJournalStore((state) => state.deleteActivity);
  const continueActivity = useJournalStore((state) => state.continueActivity);
  const refreshDay = useJournalStore((state) => state.refreshDay);
  const day = useMemo(
    () => days.find((currentDay) => currentDay.date === date) ?? null,
    [days, date]
  );
  const entries = day?.cards ?? [];
  const activities = day?.activities ?? [];
  const setSummary = useJournalStore((state) => state.setSummary);
  
  useEffect(() => {
    setReflectionText(day?.dailySummary || '');
  }, [day]);

  useEffect(() => {
    if (!date) {
      return;
    }
    void refreshDay(date);
  }, [date, refreshDay]);

  useEffect(() => {
    if (!continuedActivityId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setContinuedActivityId(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [continuedActivityId]);

  if (!date) return null;

  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, 'yyyy年M月d日', { locale: ja });

  const handleEdit = useCallback((entry: Card) => {
    setCardDraft(null);
    setEntryToEdit(entry);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEntryToEdit(null);
      setCardDraft(null);
    }, 300);
  }, []);

  const handleDelete = useCallback(async (entry: Card) => {
    const shouldDelete = window.confirm('このカードを削除しますか？');
    if (!shouldDelete) {
      return;
    }

    await deleteEntry(date, entry.id);

    if (entryToEdit?.id === entry.id) {
      handleCloseForm();
    }
  }, [date, deleteEntry, entryToEdit?.id, handleCloseForm]);

  const handleOpenNewCard = useCallback((initialDraft?: CreateCardInput) => {
    setEntryToEdit(null);
    setCardDraft(initialDraft ?? null);
    setIsFormOpen(true);
  }, []);

  const handleSaveReflection = async () => {
    await setSummary(date, reflectionText);
  };

  const handleAddActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = activityTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    await addActivity(date, {
      title: trimmedTitle,
      status: activityStatus,
    });

    setActivityTitle('');
    setActivityStatus('pending');
  };

  const handleActivityStatusChange = async (activity: DayActivity, status: DayActivityStatus) => {
    await updateActivityStatus(date, activity.id, status);
  };

  const handleContinueActivity = async (activity: DayActivity) => {
    await continueActivity(date, activity.id);
    setContinuedActivityId(activity.id);
  };

  const handleDeleteActivity = async (activity: DayActivity) => {
    const shouldDelete = window.confirm('このTODOを削除しますか？');
    if (!shouldDelete) {
      return;
    }

    await deleteActivity(date, activity.id);
    if (continuedActivityId === activity.id) {
      setContinuedActivityId(null);
    }
  };

  const handleCreateCardFromActivity = useCallback((activity: DayActivity) => {
    handleOpenNewCard({
      trigger: {
        type: 'external',
        content: `${activity.title}（${getDayActivityStatusLabel(activity.status)}）`,
      },
      steps:
        activity.status === 'pending'
          ? [
              {
                id: `activity-${activity.id}-thought`,
                order: 1,
                type: 'thought',
                content: '何故出来なかった？',
              },
            ]
          : [],
    });
  }, [handleOpenNewCard]);

  const generateMarkdown = () => {
    let md = `# ${formattedDate}\n\n`;
    entries.forEach((entry, index) => {
      md += `${generateCardMarkdown(entry, `## カード ${index + 1}`)}\n\n`;
    });
    return md;
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const preventTextareaBlurOnPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate('/calendar')}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        カレンダーに戻る
      </button>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-2">{formattedDate}</h2>
          <p className="text-stone-500">
            {entries.length}件の記録
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            {showMarkdown ? 'カード表示に戻す' : 'マークダウン表示'}
          </button>
        )}
      </header>

      {/* AI Summary Section */}
      <div className="bg-stone-100/80 rounded-2xl p-6 mb-8 border border-stone-200/60 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-stone-300" />
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-stone-700 mb-1">1日の振り返り</h3>
            <div className="mt-2">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder={getReflectionPlaceholder('day')}
                className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all resize-none min-h-[120px] text-sm text-stone-800 placeholder:text-stone-400"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveReflection}
                  onPointerDown={preventTextareaBlurOnPointerDown}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-stone-200/60 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-stone-800">イベント・TODO</h3>
            <p className="text-sm text-stone-500">日ごとの予定やタスクを保存し、必要ならそのまま記録カード化できます。</p>
          </div>
        </div>

        <form onSubmit={handleAddActivity} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <input
            value={activityTitle}
            onChange={(e) => setActivityTitle(e.target.value)}
            placeholder="イベント名 / TODO名を入力"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          />
          <select
            value={activityStatus}
            onChange={(e) => setActivityStatus(e.target.value as DayActivityStatus)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          >
            {dayActivityStatuses.map((status) => (
              <option key={status} value={status}>
                {getDayActivityStatusLabel(status)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-stone-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
              この日のイベント・TODOはまだありません。
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        activity.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                      ].join(' ')}
                    >
                      {getDayActivityStatusLabel(activity.status)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-stone-800 whitespace-pre-wrap">{activity.title}</p>
                  {continuedActivityId === activity.id ? (
                    <p className="mt-3 text-sm text-emerald-700">翌日へ追加しました。</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:min-w-[220px] sm:items-end">
                  <select
                    value={activity.status}
                    onChange={(e) => handleActivityStatusChange(activity, e.target.value as DayActivityStatus)}
                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition-colors focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
                  >
                    {dayActivityStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getDayActivityStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(activity)}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
                      aria-label="TODOを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContinueActivity(activity)}
                      className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      継続
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCreateCardFromActivity(activity)}
                      className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                    >
                      記録の追加
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showMarkdown ? (
        <div className="mb-24 bg-stone-800 rounded-2xl p-6 relative group">
          <button
            onClick={handleCopyMarkdown}
            className="absolute top-4 right-4 p-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'コピーしました' : 'コピー'}
          </button>
          <pre className="text-stone-300 text-sm font-mono whitespace-pre-wrap overflow-x-auto pt-8">
            {generateMarkdown()}
          </pre>
        </div>
      ) : (
        <div className="space-y-6 mb-24">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
          
          {entries.length === 0 && !isFormOpen && (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
              <p>この日の記録はまだありません。</p>
              <p className="text-sm mt-1">＋ボタンまたは「記録の追加」からジャーナリングを始めましょう。</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <AnimatePresence>
        {!isFormOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => handleOpenNewCard()}
            className="fixed bottom-8 right-8 w-14 h-14 bg-stone-800 text-stone-50 rounded-full shadow-lg flex items-center justify-center hover:bg-stone-700 hover:scale-105 transition-all z-20"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Form Modal/Overlay */}
      <AnimatePresence>
        {isFormOpen && (
          <JournalForm 
            date={date} 
            onClose={handleCloseForm} 
            entryToEdit={entryToEdit}
            initialEntry={cardDraft}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
