import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Sparkles, Edit2, Save, Copy, FileText, Check } from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';
import JournalCard from '../components/JournalCard';

export default function MonthPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const allEntries = useJournalStore((state) => state.entries);
  const summaries = useJournalStore((state) => state.summaries);
  const weeklyReflections = useJournalStore((state) => state.weeklyReflections);
  const monthlyReflections = useJournalStore((state) => state.monthlyReflections);
  const setMonthlyReflection = useJournalStore((state) => state.setMonthlyReflection);

  const monthKey = yearMonth || '';
  const currentReflection = monthlyReflections[monthKey] || '';

  useEffect(() => {
    if (!isEditingReflection) {
      setReflectionText(currentReflection);
    }
  }, [currentReflection, isEditingReflection]);

  if (!yearMonth) return null;

  // yearMonth format is YYYY-MM
  const startDate = parseISO(`${yearMonth}-01`);
  const endDate = endOfMonth(startDate);
  const formattedMonth = format(startDate, 'yyyy年M月', { locale: ja });

  // Get all days in this month
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'yyyy-MM-dd'));
  
  // Get all weeks in this month
  const weeksInMonth = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 }).map(d => format(d, 'yyyy-MM-dd'));

  // Filter entries for this month
  const monthEntries = useMemo(() => {
    return allEntries.filter(e => daysInMonth.includes(e.date));
  }, [allEntries, daysInMonth]);

  const handleSaveReflection = () => {
    setMonthlyReflection(monthKey, reflectionText);
    setIsEditingReflection(false);
  };

  const generateMarkdown = () => {
    let md = `# ${formattedMonth}の振り返り\n\n`;
    
    if (currentReflection) {
      md += `## 今月のメモ\n${currentReflection}\n\n`;
    }

    weeksInMonth.forEach((weekStartStr) => {
      const weekRef = weeklyReflections[weekStartStr];
      if (weekRef) {
        md += `## 週の振り返り (${format(parseISO(weekStartStr), 'M/d', { locale: ja })}〜)\n${weekRef}\n\n`;
      }
    });

    daysInMonth.forEach((dateStr) => {
      const dayEntries = monthEntries.filter(e => e.date === dateStr);
      const daySummary = summaries[dateStr];
      
      if (dayEntries.length > 0 || daySummary?.reflection) {
        md += `## ${format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })}\n\n`;
        
        if (daySummary?.reflection) {
          md += `### 1日の振り返り\n${daySummary.reflection}\n\n`;
        }

        dayEntries.forEach((entry, index) => {
          md += `### カード ${index + 1}\n`;
          if (entry.fact) md += `#### 事実\n${entry.fact}\n\n`;
          if (entry.thought) md += `#### 思考\n${entry.thought}\n\n`;
          if (entry.emotion) md += `#### 感情\n${entry.emotion}\n\n`;
          if (entry.sensation) md += `#### 身体感覚\n${entry.sensation}\n\n`;
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate('/calendar')}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        カレンダー表示
      </button>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-2">{formattedMonth}</h2>
          <p className="text-stone-500">
            今月の記録: {monthEntries.length}件
          </p>
        </div>
        {(monthEntries.length > 0 || currentReflection) && (
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            {showMarkdown ? '通常表示に戻す' : 'マークダウン表示'}
          </button>
        )}
      </header>

      {/* Monthly Reflection Section */}
      <div className="bg-stone-100/80 rounded-2xl p-6 mb-8 border border-stone-200/60 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-stone-300" />
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-medium text-stone-700">月の振り返りメモ</h3>
              {!isEditingReflection && (
                <button
                  onClick={() => setIsEditingReflection(true)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="振り返りを編集"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {isEditingReflection ? (
              <div className="mt-2">
                <textarea
                  value={reflectionText}
                  onChange={(e) => setReflectionText(e.target.value)}
                  placeholder="今月の振り返りや気づきを記入してください..."
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all resize-none min-h-[120px] text-sm text-stone-800 placeholder:text-stone-400"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => {
                      setIsEditingReflection(false);
                      setReflectionText(currentReflection);
                    }}
                    className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveReflection}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-stone-800 text-stone-50 hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </div>
            ) : (
              currentReflection ? (
                <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{currentReflection}</p>
              ) : (
                <p className="text-stone-500 text-sm italic">
                  右上の編集ボタンから、今月の振り返りを入力できます。
                </p>
              )
            )}
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
          {daysInMonth.map((dateStr) => {
            const dayEntries = monthEntries.filter(e => e.date === dateStr);
            const daySummary = summaries[dateStr];
            
            if (dayEntries.length === 0 && !daySummary?.reflection) return null;

            return (
              <div key={dateStr} className="space-y-4">
                <h3 className="text-lg font-medium text-stone-800 border-b border-stone-200 pb-2">
                  {format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })}
                </h3>
                
                {daySummary?.reflection && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/60">
                    <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">1日の振り返り</h4>
                    <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{daySummary.reflection}</p>
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
          
          {monthEntries.length === 0 && !currentReflection && (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
              <p>今月の記録はまだありません。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
