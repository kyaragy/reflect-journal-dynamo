import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowRight, Brain, Check, Heart, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useJournalStore, type Card } from '../store/useJournalStore';
import {
  createCardStep,
  createEmptyTrigger,
  hasMeaningfulCardContent,
  getStepTypeLabel,
  journalCardTags,
  stepTypes,
  type CardStep,
  type JournalCardTag,
  type StepType,
  type TriggerType,
  type CreateCardInput,
} from '../domain/journal';
import { triggerPlaceholder } from '../lib/reflectionPlaceholders';

interface JournalFormProps {
  date: string;
  onClose: () => void;
  entryToEdit?: Card | null;
  initialEntry?: CreateCardInput | null;
}

const stepIconMap: Record<StepType, typeof Brain> = {
  thought: Brain,
  emotion: Heart,
  action: ArrowRight,
  body: Activity,
};

const stepSectionClassMap: Record<StepType, string> = {
  thought: 'border-indigo-100 bg-indigo-50/55',
  emotion: 'border-rose-100 bg-rose-50/55',
  action: 'border-amber-100 bg-amber-50/60',
  body: 'border-emerald-100 bg-emerald-50/55',
};

const stepHeaderClassMap: Record<StepType, string> = {
  thought: 'text-indigo-700',
  emotion: 'text-rose-700',
  action: 'text-amber-700',
  body: 'text-emerald-700',
};

const stepNumberClassMap: Record<StepType, string> = {
  thought: 'bg-indigo-100 text-indigo-700',
  emotion: 'bg-rose-100 text-rose-700',
  action: 'bg-amber-100 text-amber-700',
  body: 'bg-emerald-100 text-emerald-700',
};

const stepOptionClassMap: Record<StepType, string> = {
  thought: 'border-indigo-200 bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  emotion: 'border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-200',
  action: 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200',
  body: 'border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
};

const stepTextareaClassMap: Record<StepType, string> = {
  thought: 'border-indigo-100 bg-white focus:ring-indigo-200 focus:border-indigo-400',
  emotion: 'border-rose-100 bg-white focus:ring-rose-200 focus:border-rose-400',
  action: 'border-amber-100 bg-white focus:ring-amber-200 focus:border-amber-400',
  body: 'border-emerald-100 bg-white focus:ring-emerald-200 focus:border-emerald-400',
};

interface StepEditorProps {
  step: CardStep;
  index: number;
  maxTextareaHeight: number;
  isActive: boolean;
  setStepRef: (stepId: string, element: HTMLTextAreaElement | null) => void;
  setStepSectionRef: (stepId: string, element: HTMLDivElement | null) => void;
  onRemove: (stepId: string) => void;
  onTypeChange: (stepId: string, type: StepType) => void;
  onContentChange: (stepId: string, content: string, element: HTMLTextAreaElement) => void;
  onFocus: (stepId: string, element: HTMLTextAreaElement) => void;
  onBlur: () => void;
  onPreventPointerFocusChange: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

const StepEditor = React.memo(function StepEditor({
  step,
  index,
  maxTextareaHeight,
  isActive,
  setStepRef,
  setStepSectionRef,
  onRemove,
  onTypeChange,
  onContentChange,
  onFocus,
  onBlur,
  onPreventPointerFocusChange,
}: StepEditorProps) {
  const Icon = stepIconMap[step.type];

  return (
    <div
      ref={(element) => {
        setStepSectionRef(step.id, element);
      }}
      className={[
        'rounded-3xl border p-4 sm:p-5 space-y-4 transition-colors',
        stepSectionClassMap[step.type],
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
              stepNumberClassMap[step.type],
            ].join(' ')}
          >
            {index + 1}
          </div>
          <div className={['flex items-center gap-2 text-sm font-semibold', stepHeaderClassMap[step.type]].join(' ')}>
            <Icon className="w-4 h-4" />
            <span>{getStepTypeLabel(step.type)}</span>
          </div>
        </div>
        <button
          type="button"
          onPointerDown={onPreventPointerFocusChange}
          onClick={() => onRemove(step.id)}
          className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          削除
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {stepTypes.map((type) => {
          const isSelected = step.type === type;
          return (
            <button
              key={type}
              type="button"
              onPointerDown={onPreventPointerFocusChange}
              onClick={() => onTypeChange(step.id, type)}
              className={[
                'rounded-full border px-3.5 py-2 text-sm font-medium transition-all',
                isSelected
                  ? stepOptionClassMap[type]
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300',
              ].join(' ')}
            >
              {getStepTypeLabel(type)}
            </button>
          );
        })}
      </div>

      <textarea
        ref={(element) => {
          setStepRef(step.id, element);
        }}
        rows={3}
        value={step.content}
        onChange={(e) => onContentChange(step.id, e.target.value, e.target)}
        onFocus={(e) => onFocus(step.id, e.currentTarget)}
        onBlur={onBlur}
        placeholder={`${getStepTypeLabel(step.type)}として記録したい内容を書いてください`}
        className={[
          'w-full rounded-2xl border px-4 py-3.5 text-[15px] leading-6 text-stone-800 placeholder:text-stone-400 outline-none transition-all duration-200 resize-none focus:ring-2 min-h-[96px]',
          stepTextareaClassMap[step.type],
          isActive ? 'ring-2' : '',
        ].join(' ')}
        style={{ maxHeight: `${maxTextareaHeight}px` }}
      />
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.step === nextProps.step
  && prevProps.index === nextProps.index
  && prevProps.isActive === nextProps.isActive
));

export default function JournalForm({ date, onClose, entryToEdit, initialEntry }: JournalFormProps) {
  const addEntry = useJournalStore((state) => state.addEntry);
  const updateEntry = useJournalStore((state) => state.updateEntry);
  const saving = useJournalStore((state) => state.saving);
  const error = useJournalStore((state) => state.error);

  const [tag, setTag] = useState<JournalCardTag | undefined>(undefined);
  const [triggerType, setTriggerType] = useState<TriggerType>('external');
  const [triggerContent, setTriggerContent] = useState('');
  const [steps, setSteps] = useState<CardStep[]>([createCardStep(1)]);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  const formScrollRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const stepSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingScrollStepIdRef = useRef<string | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const maxTextareaHeight = 240;
  const toolbarBaseHeight = 92;
  const stepCount = steps.length;

  useEffect(() => {
    if (entryToEdit) {
      setTag(entryToEdit.tag);
      setTriggerType(entryToEdit.trigger.type);
      setTriggerContent(entryToEdit.trigger.content);
      setSteps(entryToEdit.steps.length > 0 ? entryToEdit.steps : [createCardStep(1)]);
      return;
    }

    if (initialEntry) {
      setTag(initialEntry.tag);
      setTriggerType(initialEntry.trigger?.type ?? createEmptyTrigger().type);
      setTriggerContent(initialEntry.trigger?.content ?? '');
      setSteps(
        initialEntry.steps && initialEntry.steps.length > 0
          ? initialEntry.steps.map((step, index) => ({
              ...step,
              id: step.id || createCardStep(index + 1).id,
              order: index + 1,
            }))
          : [createCardStep(1)]
      );
      return;
    }

    setTag(undefined);
    setTriggerType(createEmptyTrigger().type);
    setTriggerContent('');
    setSteps([createCardStep(1)]);
  }, [entryToEdit, initialEntry]);

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

  const adjustTextareaHeight = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }

    element.style.height = 'auto';
    const nextHeight = Math.min(element.scrollHeight, maxTextareaHeight);
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
  }, []);

  const scheduleAdjustTextareaHeight = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) {
      return;
    }

    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      adjustTextareaHeight(element);
      resizeFrameRef.current = null;
    });
  }, [adjustTextareaHeight]);

  useEffect(() => {
    scheduleAdjustTextareaHeight(textareaRefs.current.trigger);
    steps.forEach((step) => {
      scheduleAdjustTextareaHeight(textareaRefs.current[step.id]);
    });
  }, [entryToEdit, initialEntry, scheduleAdjustTextareaHeight, stepCount]);

  useEffect(() => () => {
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateViewportMode = () => setIsCompactViewport(mediaQuery.matches);

    updateViewportMode();
    mediaQuery.addEventListener('change', updateViewportMode);

    return () => {
      mediaQuery.removeEventListener('change', updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (!pendingScrollStepIdRef.current) {
      return;
    }

    const stepElement = stepSectionRefs.current[pendingScrollStepIdRef.current];
    pendingScrollStepIdRef.current = null;
    if (!stepElement) {
      return;
    }

    window.setTimeout(() => {
      stepElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 120);
  }, [steps]);

  const scrollFieldIntoView = useCallback((element: HTMLTextAreaElement) => {
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
  }, []);

  const handleFieldBlur = useCallback(() => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;
      const isToolbarTarget = toolbarRef.current?.contains(activeElement);
      const isTextareaTarget = Object.values(textareaRefs.current).some((element) => element === activeElement);
      if (!isToolbarTarget && !isTextareaTarget) {
        setActiveFieldKey(null);
      }
    }, 0);
  }, []);

  const blurActiveField = useCallback(() => {
    if (!activeFieldKey) {
      return;
    }

    textareaRefs.current[activeFieldKey]?.blur();
    setActiveFieldKey(null);
  }, [activeFieldKey]);

  const preventPointerFocusChange = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    // Keep the focused textarea active until the action completes.
    e.preventDefault();
  }, []);

  const setStepValue = useCallback((stepId: string, patch: Partial<CardStep>) => {
    setSteps((currentSteps) => {
      let changed = false;

      const nextSteps = currentSteps.map((step) => {
        if (step.id !== stepId) {
          return step;
        }

        const nextStep = {
          ...step,
          ...patch,
        };

        const hasDiff = Object.keys(patch).some((key) => nextStep[key as keyof CardStep] !== step[key as keyof CardStep]);
        if (hasDiff) {
          changed = true;
          return nextStep;
        }

        return step;
      });

      return changed ? nextSteps : currentSteps;
    });
  }, []);

  const addStep = useCallback(() => {
    setSteps((currentSteps) => {
      const nextStep = createCardStep(currentSteps.length + 1);
      pendingScrollStepIdRef.current = nextStep.id;
      return [...currentSteps, { ...nextStep, order: currentSteps.length + 1 }];
    });
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((currentSteps) => {
      const filtered = currentSteps.filter((step) => step.id !== stepId);
      const nextSteps = filtered.length > 0 ? filtered : [createCardStep(1)];
      return nextSteps.map((step, index) => ({
        ...step,
        order: index + 1,
      }));
    });

    if (activeFieldKey === stepId) {
      setActiveFieldKey(null);
    }
  }, [activeFieldKey]);

  const setStepTextareaRef = useCallback((stepId: string, element: HTMLTextAreaElement | null) => {
    textareaRefs.current[stepId] = element;
  }, []);

  const setStepSectionRef = useCallback((stepId: string, element: HTMLDivElement | null) => {
    stepSectionRefs.current[stepId] = element;
  }, []);

  const handleStepTypeChange = useCallback((stepId: string, type: StepType) => {
    setStepValue(stepId, { type });
  }, [setStepValue]);

  const handleStepContentChange = useCallback((stepId: string, content: string, element: HTMLTextAreaElement) => {
    setStepValue(stepId, { content });
    scheduleAdjustTextareaHeight(element);
  }, [scheduleAdjustTextareaHeight, setStepValue]);

  const handleStepFocus = useCallback((stepId: string, element: HTMLTextAreaElement) => {
    setActiveFieldKey(stepId);
    scheduleAdjustTextareaHeight(element);
    scrollFieldIntoView(element);
  }, [scheduleAdjustTextareaHeight, scrollFieldIntoView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedSteps = steps
      .map((step, index) => ({
        ...step,
        order: index + 1,
      }))
      .filter((step) => step.content.trim().length > 0);

    const hasContent = hasMeaningfulCardContent({
      trigger: {
        content: triggerContent,
      },
      steps: normalizedSteps,
    });
    if (!hasContent) {
      onClose();
      return;
    }

    const payload = {
      tag,
      trigger: {
        type: triggerType,
        content: triggerContent,
      },
      steps: normalizedSteps,
    };

    if (entryToEdit) {
      await updateEntry(date, entryToEdit.id, payload);
    } else {
      await addEntry({
        date,
        ...payload,
      });
    }

    onClose();
  };

  const toolbarBottom = keyboardInset > 0
    ? `calc(${keyboardInset}px + env(safe-area-inset-bottom))`
    : 'env(safe-area-inset-bottom)';
  const formBottomPadding = activeFieldKey !== null
    ? `calc(${toolbarBaseHeight}px + ${keyboardInset}px + env(safe-area-inset-bottom) + 1rem)`
    : '1.5rem';
  const shouldShowMobileToolbar = isCompactViewport && activeFieldKey !== null && keyboardInset > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/35 p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-stone-50 w-full max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[100dvh] sm:max-h-[90vh] flex flex-col will-change-transform"
      >
        <div className="flex justify-between items-center px-4 py-4 sm:p-6 border-b border-stone-200 bg-white">
          <h3 className="text-xl font-serif font-medium text-stone-800">{entryToEdit ? '記録を編集' : '新しい記録'}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          ref={formScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-6"
          style={{ paddingBottom: formBottomPadding }}
        >
          <form id="journal-form" onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-2">
              <div className="text-sm font-semibold tracking-[0.08em] text-stone-600">カテゴリ</div>
              <div className="flex flex-wrap gap-2">
                {journalCardTags.map((option) => {
                  const isSelected = tag === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onPointerDown={preventPointerFocusChange}
                      onClick={() => setTag(isSelected ? undefined : option)}
                      className={[
                        'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                        isSelected
                          ? 'border-stone-800 bg-stone-800 text-stone-50 shadow-sm'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50',
                      ].join(' ')}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em] text-stone-600">
                <Sparkles className="w-4 h-4" />
                <span>きっかけ</span>
              </div>

              <textarea
                ref={(element) => {
                  textareaRefs.current.trigger = element;
                }}
                rows={4}
                value={triggerContent}
                onChange={(e) => {
                  setTriggerContent(e.target.value);
                  scheduleAdjustTextareaHeight(e.target);
                }}
                onFocus={(e) => {
                  setActiveFieldKey('trigger');
                  scheduleAdjustTextareaHeight(e.currentTarget);
                  scrollFieldIntoView(e.currentTarget);
                }}
                onBlur={handleFieldBlur}
                placeholder={triggerPlaceholder}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3.5 text-[15px] leading-6 text-stone-800 placeholder:text-stone-400 outline-none transition-all duration-200 resize-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 min-h-[132px]"
                style={{ maxHeight: `${maxTextareaHeight}px` }}
              />
            </section>

            <section className="space-y-4">
              <div className="text-sm font-semibold tracking-[0.08em] text-stone-600">ステップ</div>

              <div className="grid gap-4">
                {steps.map((step, index) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    index={index}
                    maxTextareaHeight={maxTextareaHeight}
                    isActive={activeFieldKey === step.id}
                    setStepRef={setStepTextareaRef}
                    setStepSectionRef={setStepSectionRef}
                    onRemove={removeStep}
                    onTypeChange={handleStepTypeChange}
                    onContentChange={handleStepContentChange}
                    onFocus={handleStepFocus}
                    onBlur={handleFieldBlur}
                    onPreventPointerFocusChange={preventPointerFocusChange}
                  />
                ))}
              </div>

              <div className="flex justify-start pt-1">
                <button
                  type="button"
                  onPointerDown={preventPointerFocusChange}
                  onClick={addStep}
                  className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  ステップを追加
                </button>
              </div>
            </section>
          </form>
        </div>

        <div className="border-t border-stone-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
          <button
            type="submit"
            form="journal-form"
            onPointerDown={preventPointerFocusChange}
            disabled={saving}
            className="w-full py-4 bg-stone-800 text-stone-50 rounded-xl font-medium hover:bg-stone-700 transition-colors shadow-sm"
          >
            {saving ? '保存中...' : entryToEdit ? '更新する' : '保存する'}
          </button>
        </div>

        {shouldShowMobileToolbar ? (
          <div
            ref={toolbarRef}
            className="fixed inset-x-0 z-[60] mx-auto w-full max-w-5xl border-t border-stone-200/80 bg-white/95 px-3 py-3 shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] backdrop-blur supports-[backdrop-filter]:bg-white/80"
            style={{ bottom: toolbarBottom }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onPointerDown={preventPointerFocusChange}
                onClick={addStep}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm font-medium text-stone-700 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                追加
              </button>
              <button
                type="button"
                onPointerDown={preventPointerFocusChange}
                onClick={blurActiveField}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 transition-colors"
              >
                <Check className="h-4 w-4" />
                完了
              </button>
              <button
                type="submit"
                form="journal-form"
                onPointerDown={preventPointerFocusChange}
                disabled={saving}
                className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-800 px-4 text-sm font-semibold text-stone-50 shadow-sm transition-colors hover:bg-stone-700 disabled:opacity-60"
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
