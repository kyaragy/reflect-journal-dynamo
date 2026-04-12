import { startOfWeek, format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ja } from 'date-fns/locale';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import ThinkingReflectionPreview from '../components/thinking/ThinkingReflectionPreview';
import ThinkingQuestionResponseModal from '../components/thinking/ThinkingQuestionResponseModal';
import { useThinkingReflectionStore } from '../store/useThinkingReflectionStore';

export default function V2ThinkingReflectionPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const days = useThinkingReflectionStore((state) => state.days);
  const refreshDay = useThinkingReflectionStore((state) => state.refreshDay);
  const saveQuestionResponses = useThinkingReflectionStore((state) => state.saveQuestionResponses);
  const saving = useThinkingReflectionStore((state) => state.saving);

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
  const reflection = day?.thinkingReflection;
  const questionResponseMap = useMemo(
    () => Object.fromEntries((day?.questionResponses ?? []).map((item) => [item.question, item.response])),
    [day?.questionResponses]
  );
  const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 0 }), 'yyyy-MM-dd');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => navigate(`/v2/day/${date}`)} className="mb-6 flex items-center text-stone-500 transition-colors hover:text-stone-800">
        <ArrowLeft className="mr-2 h-4 w-4" />
        日次ハブへ戻る
      </button>

      <header className="mb-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Thinking Reflection</p>
        <h2 className="mt-2 font-serif text-3xl text-stone-900">{format(parseISO(date), 'yyyy年M月d日', { locale: ja })}</h2>
        <p className="mt-2 text-sm text-stone-500">ChatGPTから取り込んだJSONをもとに、元カードと分類結果を並べています。</p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(`/v2/week/${weekStart}/thinking`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            <CalendarRange className="h-4 w-4" />
            この週の集約を見る
          </button>
        </div>
      </header>

      {day && reflection ? (
        <ThinkingReflectionPreview
          reflection={reflection}
          memoCards={day.memoCards}
          questionResponses={questionResponseMap}
          onQuestionSelect={setSelectedQuestion}
        />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-stone-200 px-4 py-16 text-center text-sm text-stone-400">
          この日の思考振り返りはまだ保存されていません。
        </div>
      )}

      {day && selectedQuestion ? (
        <ThinkingQuestionResponseModal
          question={selectedQuestion}
          initialResponse={questionResponseMap[selectedQuestion] ?? ''}
          saving={saving}
          onClose={() => setSelectedQuestion(null)}
          onSave={async (response) => {
            const remaining = (reflection?.questions ?? []).map((question) => ({
              question,
              response: question === selectedQuestion ? response : questionResponseMap[question] ?? '',
            }));
            await saveQuestionResponses(date, remaining);
            setSelectedQuestion(null);
          }}
        />
      ) : null}
    </div>
  );
}
