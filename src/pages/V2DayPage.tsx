import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, CalendarRange, ChevronLeft, ChevronRight, MessageCircleQuestion, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';
import ThinkingMemoFormModal from '../components/thinking/ThinkingMemoFormModal';
import ThinkingPromptModal from '../components/thinking/ThinkingPromptModal';
import ThinkingImportModal from '../components/thinking/ThinkingImportModal';
import ThinkingQuestionResponseModal from '../components/thinking/ThinkingQuestionResponseModal';
import ThinkingTagManagerModal from '../components/thinking/ThinkingTagManagerModal';
import { generateThinkingReflectionPrompt } from '../lib/thinkingReflectionPrompt';
import type { ThinkingEntry } from '../domain/thinkingReflection';

export default function V2DayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<ThinkingEntry | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipePointerIdRef = useRef<number | null>(null);

  const days = useThinkingReflectionStore((state) => state.days);
  const saving = useThinkingReflectionStore((state) => state.saving);
  const refreshDay = useThinkingReflectionStore((state) => state.refreshDay);
  const addEntry = useThinkingReflectionStore((state) => state.addEntry);
  const updateEntry = useThinkingReflectionStore((state) => state.updateEntry);
  const deleteEntry = useThinkingReflectionStore((state) => state.deleteEntry);
  const saveThinkingReflection = useThinkingReflectionStore((state) => state.saveThinkingReflection);
  const saveQuestionResponses = useThinkingReflectionStore((state) => state.saveQuestionResponses);

  useEffect(() => {
    if (!date) {
      return;
    }

    void refreshDay(date);
  }, [date, refreshDay]);

  if (!date) {
    return null;
  }

  const day = days.find((item) => item.date === date) ?? null;
  const entries = day?.entries ?? [];
  const reflection = day?.thinkingReflection ?? null;
  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, 'yyyy年M月d日', { locale: ja });
  const previousDate = format(addDays(parsedDate, -1), 'yyyy-MM-dd');
  const nextDate = format(addDays(parsedDate, 1), 'yyyy-MM-dd');
  const existingTags = Array.from(
    new Set(days.flatMap((item) => item.entries.flatMap((entry) => entry.tags ?? [])))
  ).sort((left, right) => left.localeCompare(right));
  const prompt = generateThinkingReflectionPrompt(date, entries, existingTags);
  const weekStart = format(startOfWeek(parsedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const monthKey = format(parsedDate, 'yyyy-MM');
  const questionResponseMap = Object.fromEntries((day?.questionResponses ?? []).map((item) => [item.question, item.response]));
  const reflectionCardMap = new Map((reflection?.cards ?? []).map((card) => [card.card_id, card]));
  const SWIPE_THRESHOLD = 60;

  const handleSwipe = (startX: number, startY: number, endX: number, endY: number) => {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }
    // Horizontal swipe only: avoid conflicting with vertical scroll.
    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }
    navigate(deltaX < 0 ? `/v2/day/${nextDate}` : `/v2/day/${previousDate}`);
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500"
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') {
          return;
        }
        swipePointerIdRef.current = event.pointerId;
        swipeStartRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'touch' || swipePointerIdRef.current !== event.pointerId) {
          return;
        }
        const start = swipeStartRef.current;
        swipePointerIdRef.current = null;
        swipeStartRef.current = null;
        if (!start) {
          return;
        }
        handleSwipe(start.x, start.y, event.clientX, event.clientY);
      }}
      onPointerCancel={(event) => {
        if (swipePointerIdRef.current !== event.pointerId) {
          return;
        }
        swipePointerIdRef.current = null;
        swipeStartRef.current = null;
      }}
    >
      <nav className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/v2/home')}
          className="flex items-center text-stone-500 transition-colors hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ホームへ戻る
        </button>
      </nav>

      <header className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="grid w-full max-w-2xl grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <button
              type="button"
              onClick={() => navigate(`/v2/day/${previousDate}`)}
              className="order-2 inline-flex h-11 w-24 items-center justify-center justify-self-end gap-1.5 rounded-2xl border border-stone-300 bg-stone-100 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:order-1"
            >
              <ChevronLeft className="h-4 w-4" />
              前日
            </button>
            <h2 className="order-1 col-span-2 whitespace-nowrap text-center font-serif text-2xl text-stone-900 sm:order-2 sm:col-span-1 sm:text-3xl">{formattedDate}</h2>
            <button
              type="button"
              onClick={() => navigate(`/v2/day/${nextDate}`)}
              className="order-3 inline-flex h-11 w-24 items-center justify-center justify-self-start gap-1.5 rounded-2xl border border-stone-300 bg-stone-100 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              翌日
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-sm text-stone-500">
            {entries.length}件の記録
            {reflection ? ' · 振り返り済み' : ' · 振り返り未実施'}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsMemoModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-600"
          >
            <Plus className="h-4 w-4" />
            記録する
          </button>
          <button
            type="button"
            onClick={() => setIsPromptModalOpen(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            ChatGPT用に出力
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            JSONを取り込む
          </button>
          <button
            type="button"
            onClick={() => setIsTagManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200"
          >
            タグ管理
          </button>
          {reflection ? (
            <button
              type="button"
              onClick={() => navigate(`/v2/day/${date}/thinking`)}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
            >
              <Sparkles className="h-4 w-4" />
              思考振り返りを見る
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`/v2/week/${weekStart}/thinking`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200"
          >
            <CalendarRange className="h-4 w-4" />
            週次集約を見る
          </button>
          <button
            type="button"
            onClick={() => navigate('/v2/calendar')}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200"
          >
            <CalendarRange className="h-4 w-4" />
            月カレンダーを見る（{monthKey}）
          </button>
        </div>
      </header>

      {reflection?.questions.length ? (
        <section className="mb-6 rounded-[2rem] border border-amber-200 bg-linear-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <MessageCircleQuestion className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-600">Reflection Responses</p>
              <h3 className="mt-2 text-lg font-semibold text-stone-950">振り返り追記</h3>
              <p className="mt-1 text-sm text-stone-600">問いに対する自分の答えを残します。通常の記録カードや ChatGPT 用出力には含めません。</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {reflection.questions.map((question) => {
              const response = questionResponseMap[question] ?? '';
              return (
                <article key={question} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                  <p className="text-base font-medium leading-8 text-amber-950">{question}</p>
                  <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-stone-600">
                    {response ? response : 'まだ追記がありません。'}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedQuestion(question)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      {response ? '追記を編集' : '追記する'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {format(parseISO(entry.createdAt), 'HH:mm', { locale: ja })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(entry)}
                    className="rounded-xl border border-stone-200 bg-white p-2.5 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
                    aria-label="記録を編集"
                    title="編集"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteEntry(date, entry.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 transition-colors hover:bg-rose-100"
                    aria-label="記録を削除"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {(entry.trigger?.trim() || reflectionCardMap.get(entry.id)?.trigger?.trim()) ? (
                <p className="mt-4 whitespace-pre-wrap text-base font-bold leading-8 text-stone-900">
                  {entry.trigger?.trim() || reflectionCardMap.get(entry.id)?.trigger?.trim()}
                </p>
              ) : null}
              <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-stone-700">{entry.body}</p>
              {entry.tags?.length ? <p className="mt-3 text-sm text-stone-500">{entry.tags.join(' ')}</p> : null}
              {entry.mood ? <p className="mt-2 text-sm text-stone-500">mood: {entry.mood}</p> : null}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
            まだ記録がありません。まずは「記録する」から始めてください。
          </div>
        )}
      </section>

      {isMemoModalOpen ? (
        <ThinkingMemoFormModal
          saving={saving}
          existingTags={existingTags}
          onClose={() => setIsMemoModalOpen(false)}
          onSave={async (input) => {
            await addEntry(date, input);
            setIsMemoModalOpen(false);
          }}
        />
      ) : null}

      {editingEntry ? (
        <ThinkingMemoFormModal
          mode="edit"
          existingTags={existingTags}
          initialValue={{
            trigger: editingEntry.trigger ?? reflectionCardMap.get(editingEntry.id)?.trigger,
            body: editingEntry.body,
            tags: editingEntry.tags,
            mood: editingEntry.mood,
          }}
          saving={saving}
          onClose={() => setEditingEntry(null)}
          onSave={async (input) => {
            await updateEntry(date, editingEntry.id, input);
            setEditingEntry(null);
          }}
        />
      ) : null}

      {isPromptModalOpen ? <ThinkingPromptModal prompt={prompt} onClose={() => setIsPromptModalOpen(false)} /> : null}

      {isImportModalOpen ? (
        <ThinkingImportModal
          date={date}
          entries={entries}
          saving={saving}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (nextReflection) => {
            await saveThinkingReflection(date, nextReflection);
            setIsImportModalOpen(false);
            navigate(`/v2/day/${date}/thinking`);
          }}
        />
      ) : null}

      {isTagManagerOpen ? (
        <ThinkingTagManagerModal
          days={days}
          saving={saving}
          onClose={() => setIsTagManagerOpen(false)}
          onRenameTag={async (from, to) => {
            const updates = days.flatMap((item) =>
              item.entries
                .filter((entry) => entry.tags?.includes(from))
                .map((entry) => ({
                  date: item.date,
                  entry,
                }))
            );
            for (const update of updates) {
              const nextTags = (update.entry.tags ?? []).map((tag) => (tag === from ? to : tag));
              await updateEntry(update.date, update.entry.id, {
                trigger: update.entry.trigger,
                body: update.entry.body,
                tags: Array.from(new Set(nextTags)),
                mood: update.entry.mood,
              });
            }
          }}
          onDeleteTag={async (tag) => {
            const updates = days.flatMap((item) =>
              item.entries
                .filter((entry) => entry.tags?.includes(tag))
                .map((entry) => ({
                  date: item.date,
                  entry,
                }))
            );
            for (const update of updates) {
              const nextTags = (update.entry.tags ?? []).filter((item) => item !== tag);
              await updateEntry(update.date, update.entry.id, {
                trigger: update.entry.trigger,
                body: update.entry.body,
                tags: nextTags.length > 0 ? nextTags : undefined,
                mood: update.entry.mood,
              });
            }
          }}
        />
      ) : null}

      {day && selectedQuestion ? (
        <ThinkingQuestionResponseModal
          question={selectedQuestion}
          initialResponse={questionResponseMap[selectedQuestion] ?? ''}
          saving={saving}
          onClose={() => setSelectedQuestion(null)}
          onSave={async (response) => {
            const nextResponses = (reflection?.questions ?? []).map((question) => ({
              question,
              response: question === selectedQuestion ? response : questionResponseMap[question] ?? '',
            }));
            await saveQuestionResponses(date, nextResponses);
            setSelectedQuestion(null);
          }}
        />
      ) : null}
    </div>
  );
}
