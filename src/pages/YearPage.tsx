import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO, eachMonthOfInterval, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Sparkles, Save, Copy, FileText, Check } from 'lucide-react';
import { useJournalStore } from '../store/useJournalStore';

export default function YearPage() {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  
  const [reflectionText, setReflectionText] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const allDays = useJournalStore((state) => state.days);
  const monthlySummaries = useJournalStore((state) => state.monthlySummaries);
  const yearlySummaries = useJournalStore((state) => state.yearlySummaries);
  const setYearlyReflection = useJournalStore((state) => state.setYearlyReflection);
  const refreshYear = useJournalStore((state) => state.refreshYear);
  const saving = useJournalStore((state) => state.saving);

  const yearKey = year || '';
  const currentReflection = yearlySummaries.find((summary) => summary.yearKey === yearKey)?.summary || '';

  useEffect(() => {
    setReflectionText(currentReflection);
  }, [currentReflection]);

  useEffect(() => {
    if (!year) {
      return;
    }
    void refreshYear(year);
  }, [refreshYear, year]);

  if (!year) return null;

  const startDate = parseISO(`${year}-01-01`);
  const endDate = endOfYear(startDate);
  const formattedYear = `${year}年`;

  // Get all months in this year
  const monthsInYear = eachMonthOfInterval({ start: startDate, end: endDate }).map(d => format(d, 'yyyy-MM'));

  // Filter entries for this year
  const yearEntries = useMemo(() => {
    return allDays
      .filter((day) => day.date.startsWith(year))
      .flatMap((day) => day.cards);
  }, [allDays, year]);

  const handleSaveReflection = async () => {
    await setYearlyReflection(yearKey, reflectionText);
  };

  const generateMarkdown = () => {
    let md = `# ${formattedYear}の振り返り\n\n`;
    
    if (currentReflection) {
      md += `## 今年のメモ\n${currentReflection}\n\n`;
    }

    monthsInYear.forEach((monthStr) => {
      const monthRef = monthlySummaries.find((summary) => summary.monthKey === monthStr)?.summary;
      const monthEntries = allDays
        .filter((day) => day.date.startsWith(monthStr))
        .flatMap((day) => day.cards);
      
      if (monthEntries.length > 0 || monthRef) {
        md += `## ${format(parseISO(`${monthStr}-01`), 'M月', { locale: ja })}\n\n`;
        md += `記録数: ${monthEntries.length}件\n\n`;
        if (monthRef) {
          md += `### 月の振り返り\n${monthRef}\n\n`;
        }
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
        onClick={() => navigate('/calendar')}
        className="flex items-center text-stone-500 hover:text-stone-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        カレンダーに戻る
      </button>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-2">{formattedYear}</h2>
          <p className="text-stone-500">
            今年の記録: {yearEntries.length}件
          </p>
        </div>
        {(yearEntries.length > 0 || currentReflection) && (
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            {showMarkdown ? '通常表示に戻す' : 'マークダウン表示'}
          </button>
        )}
      </header>

      {/* Yearly Reflection Section */}
      <div className="bg-stone-100/80 rounded-2xl p-6 mb-8 border border-stone-200/60 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-stone-300" />
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-stone-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-medium text-stone-700 mb-1">年の振り返りメモ</h3>
            <div className="mt-2">
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="今年の振り返りや気づきを記入してください..."
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-24">
          {monthsInYear.map((monthStr) => {
            const monthEntries = allDays
              .filter((day) => day.date.startsWith(monthStr))
              .flatMap((day) => day.cards);
            const monthRef = monthlySummaries.find((summary) => summary.monthKey === monthStr)?.summary;
            
            return (
              <div 
                key={monthStr} 
                onClick={() => navigate(`/month/${monthStr}`)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/60 cursor-pointer hover:border-stone-300 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-serif font-medium text-stone-800 group-hover:text-stone-900 transition-colors">
                    {format(parseISO(`${monthStr}-01`), 'M月', { locale: ja })}
                  </h3>
                  <span className="text-sm font-medium text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                    {monthEntries.length}件
                  </span>
                </div>
                
                {monthRef ? (
                  <p className="text-stone-600 text-sm line-clamp-3 leading-relaxed">
                    {monthRef}
                  </p>
                ) : (
                  <p className="text-stone-400 text-sm italic">
                    月の振り返りはまだありません
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
