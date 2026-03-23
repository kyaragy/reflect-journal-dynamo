import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ArrowLeft, Plus, Sparkles, Save, Copy, FileText, Check } from 'lucide-react';
import { useJournalStore, Card } from '../store/useJournalStore';
import JournalCard from '../components/JournalCard';
import JournalForm from '../components/JournalForm';
import { motion, AnimatePresence } from 'motion/react';
import { generateCardMarkdown } from '../lib/cardMarkdown';
import { getReflectionPlaceholder } from '../lib/reflectionPlaceholders';

export default function DayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<Card | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const days = useJournalStore((state) => state.days);
  const saving = useJournalStore((state) => state.saving);
  const deleteEntry = useJournalStore((state) => state.deleteEntry);
  const refreshDay = useJournalStore((state) => state.refreshDay);
  const day = useMemo(
    () => days.find((currentDay) => currentDay.date === date) ?? null,
    [days, date]
  );
  const entries = day?.cards ?? [];
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

  if (!date) return null;

  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, 'yyyy年M月d日', { locale: ja });

  const handleEdit = (entry: Card) => {
    setEntryToEdit(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (entry: Card) => {
    const shouldDelete = window.confirm('このカードを削除しますか？');
    if (!shouldDelete) {
      return;
    }

    await deleteEntry(date, entry.id);

    if (entryToEdit?.id === entry.id) {
      handleCloseForm();
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => setEntryToEdit(null), 300); // Wait for animation to finish
  };

  const handleSaveReflection = async () => {
    await setSummary(date, reflectionText);
  };

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
          <AnimatePresence>
            {entries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
          
          {entries.length === 0 && !isFormOpen && (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
              <p>この日の記録はまだありません。</p>
              <p className="text-sm mt-1">＋ボタンをタップしてジャーナリングを始めましょう。</p>
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
            onClick={() => setIsFormOpen(true)}
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
