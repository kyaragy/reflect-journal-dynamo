import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, CalendarRange, MessageCircleQuestion, Plus, Sparkles, Upload } from 'lucide-react';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';
import ThinkingMemoFormModal from '../components/thinking/ThinkingMemoFormModal';
import ThinkingPromptModal from '../components/thinking/ThinkingPromptModal';
import ThinkingImportModal from '../components/thinking/ThinkingImportModal';
import ThinkingQuestionResponseModal from '../components/thinking/ThinkingQuestionResponseModal';
import { generateThinkingReflectionPrompt } from '../lib/thinkingReflectionPrompt';

export default function V2DayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [isMemoModalOpen, setIsMemoModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const days = useThinkingReflectionStore((state) => state.days);
  const saving = useThinkingReflectionStore((state) => state.saving);
  const refreshDay = useThinkingReflectionStore((state) => state.refreshDay);
  const addMemoCard = useThinkingReflectionStore((state) => state.addMemoCard);
  const deleteMemoCard = useThinkingReflectionStore((state) => state.deleteMemoCard);
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
  const memoCards = day?.memoCards ?? [];
  const reflection = day?.thinkingReflection ?? null;
  const formattedDate = format(parseISO(date), 'yyyy年M月d日', { locale: ja });
  const prompt = generateThinkingReflectionPrompt(date, memoCards);
  const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const questionResponseMap = Object.fromEntries((day?.questionResponses ?? []).map((item) => [item.question, item.response]));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate('/v2/calendar')} className="mb-6 flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        新版カレンダーへ戻る
      </button>

      <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Thinking Reflection</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900">{formattedDate}</h2>
          <p className="mt-2 text-sm text-stone-500">
            {memoCards.length}件の記録
            {reflection ? ' · 振り返り済み' : ' · 振り返り未実施'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
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
            disabled={memoCards.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            ChatGPT用に出力
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            disabled={memoCards.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            JSONを取り込む
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
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            <CalendarRange className="h-4 w-4" />
            週次集約を見る
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
                  <p className="text-sm font-medium leading-7 text-amber-950">{question}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">
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
        {memoCards.length > 0 ? (
          memoCards.map((card) => (
            <article key={card.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    {format(parseISO(card.createdAt), 'HH:mm', { locale: ja })}
                  </p>
                  <h3 className="mt-2 text-lg font-medium text-stone-900">{card.trigger}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteMemoCard(date, card.id)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 transition-colors hover:bg-rose-100"
                >
                  削除
                </button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{card.body}</p>
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
          onClose={() => setIsMemoModalOpen(false)}
          onSave={async (input) => {
            await addMemoCard(date, input);
            setIsMemoModalOpen(false);
          }}
        />
      ) : null}

      {isPromptModalOpen ? <ThinkingPromptModal prompt={prompt} onClose={() => setIsPromptModalOpen(false)} /> : null}

      {isImportModalOpen ? (
        <ThinkingImportModal
          date={date}
          memoCards={memoCards}
          saving={saving}
          onClose={() => setIsImportModalOpen(false)}
          onSave={async (nextReflection) => {
            await saveThinkingReflection(date, nextReflection);
            setIsImportModalOpen(false);
            navigate(`/v2/day/${date}/thinking`);
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
