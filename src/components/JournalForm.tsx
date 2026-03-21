import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useJournalStore, Card } from '../store/useJournalStore';
import { motion } from 'motion/react';
import { X, Brain, Activity, Heart, Eye, ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';

interface JournalFormProps {
  date: string;
  onClose: () => void;
  entryToEdit?: Card | null;
}

export default function JournalForm({ date, onClose, entryToEdit }: JournalFormProps) {
  const addEntry = useJournalStore((state) => state.addEntry);
  const updateEntry = useJournalStore((state) => state.updateEntry);
  const saving = useJournalStore((state) => state.saving);
  const error = useJournalStore((state) => state.error);

  const [fact, setFact] = useState('');
  const [thought, setThought] = useState('');
  const [emotion, setEmotion] = useState('');
  const [bodySensation, setBodySensation] = useState('');
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const textareaRefs = useRef<Array<HTMLTextAreaElement | null>>([]);

  const maxTextareaHeight = 240;
  const toolbarBaseHeight = 92;

  useEffect(() => {
    if (entryToEdit) {
      setFact(entryToEdit.fact || '');
      setThought(entryToEdit.thought || '');
      setEmotion(entryToEdit.emotion || '');
      setBodySensation(entryToEdit.bodySensation || '');
    }
  }, [entryToEdit]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset);
    };

    updateKeyboardInset();
    viewport.addEventListener('resize', updateKeyboardInset);
    viewport.addEventListener('scroll', updateKeyboardInset);

    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset);
      viewport.removeEventListener('scroll', updateKeyboardInset);
    };
  }, []);

  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }

    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, maxTextareaHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
  };

  useLayoutEffect(() => {
    textareaRefs.current.forEach((element) => adjustTextareaHeight(element));
  }, [fact, thought, emotion, bodySensation]);

  const scrollFieldIntoView = (element: HTMLTextAreaElement) => {
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  };

  const focusField = (index: number) => {
    const nextField = textareaRefs.current[index];
    if (!nextField) {
      return;
    }

    nextField.focus();
    scrollFieldIntoView(nextField);
    setActiveFieldIndex(index);
  };

  const handleFieldBlur = () => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      const isToolbarTarget = toolbarRef.current?.contains(activeElement);
      const isTextareaTarget = textareaRefs.current.some((element) => element === activeElement);
      if (!isToolbarTarget && !isTextareaTarget) {
        setActiveFieldIndex(null);
      }
    }, 0);
  };

  const blurActiveField = () => {
    if (activeFieldIndex === null) {
      return;
    }

    textareaRefs.current[activeFieldIndex]?.blur();
    setActiveFieldIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fact && !thought && !emotion && !bodySensation) {
      onClose();
      return;
    }
    
    if (entryToEdit) {
      await updateEntry(date, entryToEdit.id, {
        fact,
        thought,
        emotion,
        bodySensation,
      });
    } else {
      await addEntry({
        date,
        fact,
        thought,
        emotion,
        bodySensation,
      });
    }
    onClose();
  };

  const fields = [
    {
      key: 'fact',
      labelJa: '事実',
      labelEn: 'Fact',
      icon: Eye,
      color: 'stone',
      value: fact,
      setValue: setFact,
      placeholder: '何がありましたか？何をしましたか？',
    },
    {
      key: 'thought',
      labelJa: '思考',
      labelEn: 'Thought',
      icon: Brain,
      color: 'indigo',
      value: thought,
      setValue: setThought,
      placeholder: 'どんなことが頭に浮かびましたか？',
    },
    {
      key: 'emotion',
      labelJa: '感情',
      labelEn: 'Emotion',
      icon: Heart,
      color: 'rose',
      value: emotion,
      setValue: setEmotion,
      placeholder: 'どんな気持ちでしたか？',
    },
    {
      key: 'bodySensation',
      labelJa: '身体感覚',
      labelEn: 'Sensation',
      icon: Activity,
      color: 'emerald',
      value: bodySensation,
      setValue: setBodySensation,
      placeholder: '体にどんな感覚がありましたか？',
    },
  ] as const;

  const labelToneClassMap = {
    stone: 'text-stone-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
  } as const;

  const borderClassMap = {
    stone: 'border-stone-200 focus:border-stone-400 focus:ring-stone-300/60',
    indigo: 'border-indigo-100 focus:border-indigo-400 focus:ring-indigo-300/60',
    rose: 'border-rose-100 focus:border-rose-400 focus:ring-rose-300/60',
    emerald: 'border-emerald-100 focus:border-emerald-400 focus:ring-emerald-300/60',
  } as const;

  const activeFieldClassMap = {
    stone: 'border-stone-500 bg-stone-50/80 shadow-[0_10px_30px_-18px_rgba(41,37,36,0.45)] ring-2 ring-stone-200/80',
    indigo: 'border-indigo-500 bg-indigo-50/70 shadow-[0_10px_30px_-18px_rgba(99,102,241,0.35)] ring-2 ring-indigo-200/80',
    rose: 'border-rose-500 bg-rose-50/70 shadow-[0_10px_30px_-18px_rgba(244,63,94,0.35)] ring-2 ring-rose-200/80',
    emerald: 'border-emerald-500 bg-emerald-50/70 shadow-[0_10px_30px_-18px_rgba(16,185,129,0.35)] ring-2 ring-emerald-200/80',
  } as const;

  const toolbarBottom = keyboardInset > 0
    ? `calc(${keyboardInset}px + env(safe-area-inset-bottom))`
    : 'env(safe-area-inset-bottom)';
  const formBottomPadding = activeFieldIndex !== null
    ? `calc(${toolbarBaseHeight}px + ${keyboardInset}px + env(safe-area-inset-bottom) + 1rem)`
    : '1.5rem';

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

        <div
          ref={formScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6"
          style={{ paddingBottom: formBottomPadding }}
        >
          <form id="journal-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {fields.map((field, index) => {
              const Icon = field.icon;
              const isActive = activeFieldIndex === index;

              return (
                <div key={field.key} className="space-y-2">
                  <label className={`flex items-center gap-2 text-sm font-semibold tracking-[0.08em] ${labelToneClassMap[field.color]}`}>
                    <Icon className="w-4 h-4" />
                    <span>{field.labelJa}</span>
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
                      {field.labelEn}
                    </span>
                  </label>
                  <textarea
                    ref={(element) => {
                      textareaRefs.current[index] = element;
                    }}
                    rows={3}
                    value={field.value}
                    onChange={(e) => {
                      field.setValue(e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    onFocus={(e) => {
                      setActiveFieldIndex(index);
                      adjustTextareaHeight(e.currentTarget);
                      scrollFieldIntoView(e.currentTarget);
                    }}
                    onBlur={handleFieldBlur}
                    placeholder={field.placeholder}
                    className={[
                      'w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] leading-6 text-stone-800 placeholder:text-stone-400',
                      'outline-none transition-all duration-200 resize-none focus:ring-2',
                      'min-h-[88px] touch-manipulation',
                      borderClassMap[field.color],
                      isActive ? activeFieldClassMap[field.color] : '',
                    ].join(' ')}
                    style={{ maxHeight: `${maxTextareaHeight}px` }}
                  />
                </div>
              );
            })}
          </form>
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
          <button
            type="submit"
            form="journal-form"
            disabled={saving}
            className="w-full py-4 bg-stone-800 text-stone-50 rounded-xl font-medium hover:bg-stone-700 transition-colors shadow-sm"
          >
            {saving ? '保存中...' : entryToEdit ? '更新する' : '保存する'}
          </button>
        </div>

        {activeFieldIndex !== null ? (
          <div
            ref={toolbarRef}
            className="fixed inset-x-0 z-[60] mx-auto w-full max-w-lg border-t border-stone-200/80 bg-white/95 px-3 py-3 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur supports-[backdrop-filter]:bg-white/80"
            style={{ bottom: toolbarBottom }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => focusField(Math.max(0, activeFieldIndex - 1))}
                disabled={activeFieldIndex === 0}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                前へ
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => focusField(Math.min(fields.length - 1, activeFieldIndex + 1))}
                disabled={activeFieldIndex === fields.length - 1}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                次へ
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={blurActiveField}
                className="flex h-11 min-w-0 flex-[1.15] items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                入力完了
              </button>
              <button
                type="submit"
                form="journal-form"
                onMouseDown={(e) => e.preventDefault()}
                disabled={saving}
                className="flex h-11 min-w-0 flex-[1.3] items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-4 text-sm font-semibold text-stone-50 shadow-sm transition-colors hover:bg-stone-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
