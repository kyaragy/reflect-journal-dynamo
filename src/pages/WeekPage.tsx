import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, addDays, endOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Sparkles, Save, Copy, FileText, Check } from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';
import JournalCard from '../components/JournalCard';
import { generateCardMarkdown } from '../lib/cardMarkdown';
import { getReflectionPlaceholder } from '../lib/reflectionPlaceholders';

export default function WeekPage() {
  const { weekStart } = useParams<{ weekStart: string }>();
  const navigate = useNavigate();
  
  const [reflectionText, setReflectionText] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const allDays = useJournalStore((state) => state.days);
  const weeklySummaries = useJournalStore((state) => state.weeklySummaries);
  const setWeeklyReflection = useJournalStore((state) => state.setWeeklyReflection);
  const refreshWeek = useJournalStore((state) => state.refreshWeek);
  const saving = useJournalStore((state) => state.saving);

  const weekKey = weekStart || '';
  const currentReflection = weeklySummaries.find((summary) => summary.weekKey === weekKey)?.summary || '';

  useEffect(() => {
    setReflectionText(currentReflection);
  }, [currentReflection]);

  useEffect(() => {
    if (!weekStart) {
      return;
    }
    void refreshWeek(weekStart);
  }, [refreshWeek, weekStart]);

  if (!weekStart) return null;

  const startDate = parseISO(weekStart);
  const endDate = endOfWeek(startDate, { weekStartsOn: 0 });
  const formattedWeek = `${format(startDate, 'yyyy年M月d日', { locale: ja })} 〜 ${format(endDate, 'M月d日', { locale: ja })}`;

  // Get all days in this week
  const daysInWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startDate, i);
    return format(d, 'yyyy-MM-dd');
  });

  // Filter entries for this week
  const weekDays = useMemo(() => {
    return allDays.filter((day) => daysInWeek.includes(day.date));
  }, [allDays, daysInWeek]);
  const weekEntries = useMemo(() => {
    return weekDays.flatMap((day) => day.cards);
  }, [weekDays]);

  const handleSaveReflection = async () => {
    await setWeeklyReflection(weekKey, reflectionText);
  };

  const generateMarkdown = () => {
    let md = `# ${formattedWeek}の振り返り\n\n`;
    
    if (currentReflection) {
      md += `## 今週のメモ\n${currentReflection}\n\n`;
    }

    daysInWeek.forEach((dateStr) => {
      const dayRecord = weekDays.find((day) => day.date === dateStr);
      const dayEntries = dayRecord?.cards ?? [];
      
      if (dayEntries.length > 0 || dayRecord?.dailySummary) {
        md += `## ${format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })}\n\n`;
        
        if (dayRecord?.dailySummary) {
          md += `### 1日の振り返り\n${dayRecord.dailySummary}\n\n`;
        }

        dayEntries.forEach((entry, index) => {
          md += `${generateCardMarkdown(entry, `### カード ${index + 1}`)}\n\n`;
        });
      }
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
        onClick={() => navigate('/')}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        カレンダーに戻る
      </button>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-2">{formattedWeek}</h2>
          <p className="text-stone-500">
            今週の記録: {weekEntries.length}件
          </p>
        </div>
        {(weekEntries.length > 0 || currentReflection) && (
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            {showMarkdown ? '通常表示に戻す' : 'マークダウン表示'}
          </button>
        )}
      </header>

      {/* Weekly Reflection Section */}
      <div className="bg-stone-100/80 rounded-2xl p-6 mb-8 border border-stone-200/60 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-stone-300" />
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-stone-700 mb-1">週の振り返りメモ</h3>
            <div className="mt-2">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder={getReflectionPlaceholder('week')}
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
        <div className="space-y-10 mb-24">
          {daysInWeek.map((dateStr) => {
            const dayRecord = weekDays.find((day) => day.date === dateStr);
            const dayEntries = dayRecord?.cards ?? [];
            
            if (dayEntries.length === 0 && !dayRecord?.dailySummary) return null;

            return (
              <div key={dateStr} className="space-y-4">
                <h3 className="text-lg font-medium text-stone-800 border-b border-stone-200 pb-2">
                  {format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })}
                </h3>
                
                {dayRecord?.dailySummary && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/60">
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">1日の振り返り</h4>
                    <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{dayRecord.dailySummary}</p>
                  </div>
                )}

                <div className="space-y-4 pl-4 border-l-2 border-stone-100">
                  {dayEntries.map((entry) => (
                    <JournalCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })}
          
          {weekEntries.length === 0 && !currentReflection && (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
              <p>今週の記録はまだありません。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
