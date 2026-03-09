import React from 'react';
import { format } from 'date-fns';
import { JournalEntry } from '../store/useJournalStore';
import { motion } from 'motion/react';
import { Brain, Activity, Heart, Eye, Edit2 } from 'lucide-react';

interface JournalCardProps {
  entry: JournalEntry;
  onEdit?: (entry: JournalEntry) => void;
}

const JournalCard: React.FC<JournalCardProps> = ({ entry, onEdit }) => {
  const time = format(new Date(entry.createdAt), 'HH:mm');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/60 relative overflow-hidden group"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          {time}
        </span>
        {onEdit && (
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="記録を編集"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-5">
        {entry.fact && (
          <div className="flex gap-3">
            <div className="mt-1 flex-shrink-0">
              <Eye className="w-4 h-4 text-stone-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">事実 (Fact)</h4>
              <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">{entry.fact}</p>
            </div>
          </div>
        )}

        {entry.thought && (
          <div className="flex gap-3">
            <div className="mt-1 flex-shrink-0">
              <Brain className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">思考 (Thought)</h4>
              <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">{entry.thought}</p>
            </div>
          </div>
        )}

        {entry.emotion && (
          <div className="flex gap-3">
            <div className="mt-1 flex-shrink-0">
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">感情 (Emotion)</h4>
              <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">{entry.emotion}</p>
            </div>
          </div>
        )}

        {entry.sensation && (
          <div className="flex gap-3">
            <div className="mt-1 flex-shrink-0">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">身体感覚 (Sensation)</h4>
              <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">{entry.sensation}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default JournalCard;
