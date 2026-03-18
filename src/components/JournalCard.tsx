import React from 'react';
import { format } from 'date-fns';
import { Card } from '../store/useJournalStore';
import { motion } from 'motion/react';
import { Brain, Activity, Heart, Eye, Edit2, Trash2 } from 'lucide-react';

interface JournalCardProps {
  entry: Card;
  onEdit?: (entry: Card) => void;
  onDelete?: (entry: Card) => void;
}

const JournalCard: React.FC<JournalCardProps> = ({ entry, onEdit, onDelete }) => {
  const createdAt = new Date(entry.createdAt);
  const time = Number.isNaN(createdAt.getTime())
    ? format(new Date(), 'HH:mm')
    : new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Tokyo',
      }).format(createdAt);

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
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={() => onEdit(entry)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
                aria-label="記録を編集"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(entry)}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                aria-label="記録を削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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

        {entry.bodySensation && (
          <div className="flex gap-3">
            <div className="mt-1 flex-shrink-0">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">身体感覚 (Sensation)</h4>
              <p className="text-stone-800 leading-relaxed text-[15px] whitespace-pre-wrap">{entry.bodySensation}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default JournalCard;
