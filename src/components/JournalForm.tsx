import React, { useState, useEffect } from 'react';
import { useJournalStore, Card } from '../store/useJournalStore';
import { motion } from 'motion/react';
import { X, Brain, Activity, Heart, Eye } from 'lucide-react';

interface JournalFormProps {
  date: string;
  onClose: () => void;
  entryToEdit?: Card | null;
}

export default function JournalForm({ date, onClose, entryToEdit }: JournalFormProps) {
  const addEntry = useJournalStore((state) => state.addEntry);
  const updateEntry = useJournalStore((state) => state.updateEntry);
  
  const [fact, setFact] = useState('');
  const [thought, setThought] = useState('');
  const [emotion, setEmotion] = useState('');
  const [bodySensation, setBodySensation] = useState('');

  useEffect(() => {
    if (entryToEdit) {
      setFact(entryToEdit.fact || '');
      setThought(entryToEdit.thought || '');
      setEmotion(entryToEdit.emotion || '');
      setBodySensation(entryToEdit.bodySensation || '');
    }
  }, [entryToEdit]);

  const scrollFieldIntoView = (element: HTMLTextAreaElement) => {
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact && !thought && !emotion && !bodySensation) {
      // Don't save empty entries
      onClose();
      return;
    }
    
    if (entryToEdit) {
      updateEntry(date, entryToEdit.id, {
        fact,
        thought,
        emotion,
        bodySensation,
      });
    } else {
      addEntry({
        date,
        fact,
        thought,
        emotion,
        bodySensation,
      });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-stone-50 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100dvh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center px-4 py-4 sm:p-6 border-b border-stone-200 bg-white">
          <h3 className="text-xl font-serif font-medium text-stone-800">
            {entryToEdit ? '記録を編集' : '新しい記録'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6">
          <form id="journal-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 pb-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-stone-600 uppercase tracking-wider">
                <Eye className="w-4 h-4" /> 事実 (Fact)
              </label>
              <textarea
                value={fact}
                onChange={(e) => setFact(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                placeholder="何がありましたか？何をしましたか？"
                className="w-full p-3.5 sm:p-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all resize-none min-h-[96px] sm:min-h-[100px] text-[15px] text-stone-800 placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-indigo-600 uppercase tracking-wider">
                <Brain className="w-4 h-4" /> 思考 (Thought)
              </label>
              <textarea
                value={thought}
                onChange={(e) => setThought(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                placeholder="どんなことが頭に浮かびましたか？"
                className="w-full p-3.5 sm:p-4 bg-white border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition-all resize-none min-h-[96px] sm:min-h-[100px] text-[15px] text-stone-800 placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-rose-600 uppercase tracking-wider">
                <Heart className="w-4 h-4" /> 感情 (Emotion)
              </label>
              <textarea
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                placeholder="どんな気持ちでしたか？"
                className="w-full p-3.5 sm:p-4 bg-white border border-rose-100 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all resize-none min-h-[96px] sm:min-h-[100px] text-[15px] text-stone-800 placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-emerald-600 uppercase tracking-wider">
                <Activity className="w-4 h-4" /> 身体感覚 (Sensation)
              </label>
              <textarea
                value={bodySensation}
                onChange={(e) => setBodySensation(e.target.value)}
                onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                placeholder="体にどんな感覚がありましたか？"
                className="w-full p-3.5 sm:p-4 bg-white border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition-all resize-none min-h-[96px] sm:min-h-[100px] text-[15px] text-stone-800 placeholder:text-stone-400"
              />
            </div>
          </form>
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            type="submit"
            form="journal-form"
            className="w-full py-4 bg-stone-800 text-stone-50 rounded-xl font-medium hover:bg-stone-700 transition-colors shadow-sm"
          >
            {entryToEdit ? '更新する' : '保存する'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
