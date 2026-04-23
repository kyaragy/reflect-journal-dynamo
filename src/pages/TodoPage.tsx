import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  GripVertical,
  Inbox,
  Menu,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  isDueDateOverdue,
  isDueToday,
  isOverdueScheduledDate,
  todayKey,
  toDateKey,
  type CreateTodoLabelInput,
  type TodoLabel,
  type TodoTask,
  type TodoView,
} from '../domain/todo';
import {
  selectCalendarCounts,
  selectLabelTasks,
  selectOpenTasks,
  selectTodayTasks,
  selectUpcomingTasks,
  useTodoStore,
} from '../store/useTodoStore';

const viewTitles: Record<TodoView, string> = {
  today: '今日',
  upcoming: '近日予定',
  completed: '完了',
  labels: 'ラベル',
  label: 'ラベル',
  calendar: 'カレンダー',
  search: '検索',
  all: '全タスク',
};

const formatDateLabel = (date: string) => {
  const today = todayKey();
  if (date === today) {
    return '今日';
  }
  return format(parseISO(date), 'M月d日(E)', { locale: ja });
};

const formatUpcomingSectionLabel = (dateKey: string) => {
  const date = parseISO(dateKey);
  const today = todayKey();
  const tomorrow = toDateKey(addDays(new Date(), 1));
  if (dateKey === today) {
    return `${format(date, 'M月d日')}・今日・${format(date, 'EEEE', { locale: ja })}`;
  }
  if (dateKey === tomorrow) {
    return `${format(date, 'M月d日')}・明日・${format(date, 'EEEE', { locale: ja })}`;
  }
  return `${format(date, 'M月d日')}・${format(date, 'EEEE', { locale: ja })}`;
};

const formatTableDate = (date: string | null) => (date ? date : '-');

const getLabelMap = (labels: TodoLabel[]) => new Map(labels.map((label) => [label.id, label]));
const areStringArraysEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

type AddTaskComposerProps = {
  mode: 'inline' | 'modal';
  saving: boolean;
  labels: TodoLabel[];
  defaultScheduledDate: string;
  defaultLabelIds: string[];
  onCancel: () => void;
  onCreateLabel: (input: CreateTodoLabelInput) => Promise<TodoLabel>;
  onCreate: (input: {
    title: string;
    description: string;
    scheduledDate: string;
    dueDate: string | null;
    labelIds: string[];
  }) => Promise<void>;
};

function AddTaskComposer({ mode, saving, labels, defaultScheduledDate, defaultLabelIds, onCancel, onCreateLabel, onCreate }: AddTaskComposerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(defaultScheduledDate);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(defaultLabelIds);
  const [newLabelName, setNewLabelName] = useState('');
  const [creatingMentionLabel, setCreatingMentionLabel] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const mentionMatch = title.match(/(?:^| )@([^\s@]*)$/);
  const mentionQuery = mentionMatch?.[1] ?? null;
  const mentionQueryTrimmed = mentionQuery?.trim() ?? '';
  const mentionCandidates =
    mentionQuery === null
      ? []
      : labels
          .filter((label) => !selectedLabelIds.includes(label.id))
          .filter((label) => label.name.toLowerCase().includes(mentionQueryTrimmed.toLowerCase()))
          .slice(0, 6);
  const exactMentionLabel =
    mentionQueryTrimmed.length === 0
      ? null
      : labels.find((label) => label.name.toLowerCase() === mentionQueryTrimmed.toLowerCase()) ?? null;
  const canCreateMentionLabel =
    mentionQuery !== null && mentionQueryTrimmed.length > 0 && exactMentionLabel === null && !creatingMentionLabel;

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setScheduledDate((current) => (current === defaultScheduledDate ? current : defaultScheduledDate));
    setSelectedLabelIds((current) => (areStringArraysEqual(current, defaultLabelIds) ? current : defaultLabelIds));
  }, [defaultLabelIds, defaultScheduledDate]);

  const clearMentionToken = () => {
    setTitle((prev) => {
      const currentMentionMatch = prev.match(/(?:^| )@[^\s@]*$/);
      if (!currentMentionMatch || currentMentionMatch.index === undefined) {
        return prev;
      }
      const mentionTokenStart = currentMentionMatch[0].startsWith(' ')
        ? currentMentionMatch.index + 1
        : currentMentionMatch.index;
      const before = prev.slice(0, mentionTokenStart).trimEnd();
      return before ? `${before} ` : '';
    });
  };

  const attachLabelFromMention = (label: TodoLabel) => {
    setSelectedLabelIds((prev) => (prev.includes(label.id) ? prev : [...prev, label.id]));
    clearMentionToken();
  };

  const createLabelFromMention = async () => {
    if (!canCreateMentionLabel) {
      return null;
    }
    setCreatingMentionLabel(true);
    try {
      const createdLabel = await onCreateLabel({
        name: mentionQueryTrimmed,
      });
      attachLabelFromMention(createdLabel);
      return createdLabel;
    } finally {
      setCreatingMentionLabel(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    await onCreate({
      title: trimmedTitle,
      description: description.trim(),
      scheduledDate: scheduledDate || todayKey(),
      dueDate,
      labelIds: selectedLabelIds,
    });
    setTitle('');
    setDescription('');
    setScheduledDate(defaultScheduledDate);
    setDueDate(null);
    setNewLabelName('');
    setSelectedLabelIds(defaultLabelIds);
  };

  const form = (
    <form
      onSubmit={handleSubmit}
      className={[
        'overflow-hidden border border-stone-300 bg-white shadow-sm',
        mode === 'modal' ? 'w-full max-w-3xl rounded-xl' : 'rounded-lg',
      ].join(' ')}
    >
      <div className="px-4 pt-4">
        <div className="relative">
          <input
            ref={titleInputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || mentionQuery === null) {
                return;
              }
              event.preventDefault();
              const pickCandidate = exactMentionLabel ?? mentionCandidates[0] ?? null;
              if (pickCandidate) {
                attachLabelFromMention(pickCandidate);
                return;
              }
              if (canCreateMentionLabel) {
                void createLabelFromMention();
              }
            }}
            placeholder="タスク名"
            className="w-full border-none bg-transparent text-xl font-semibold text-stone-900 outline-none placeholder:text-stone-400"
          />
          {mentionQuery !== null && (mentionCandidates.length > 0 || canCreateMentionLabel) ? (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-md border border-stone-200 bg-white shadow-md">
              {mentionCandidates.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    attachLabelFromMention(label);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                >
                  <Tag className="h-4 w-4 text-stone-500" />
                  {label.name}
                </button>
              ))}
              {canCreateMentionLabel ? (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    void createLabelFromMention();
                  }}
                  className="flex w-full items-center gap-2 border-t border-stone-100 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                >
                  <Plus className="h-4 w-4 text-red-500" />
                  ラベルを作成 {mentionQueryTrimmed}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="説明"
          rows={2}
          className="mt-2 w-full resize-none border-none bg-transparent text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400"
        />
        {selectedLabelIds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedLabelIds.map((labelId) => {
              const label = labels.find((item) => item.id === labelId);
              if (!label) {
                return null;
              }
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => setSelectedLabelIds((prev) => prev.filter((item) => item !== label.id))}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-700 hover:brightness-95"
                  style={{ backgroundColor: label.color ?? '#e7e5e4' }}
                >
                  <Tag className="h-3 w-3" />
                  {label.name}
                  <X className="h-3 w-3" />
                </button>
              );
            })}
          </div>
        ) : null}
        {mode === 'inline' ? (
          <div className="mt-3">
            <select
              value=""
              onChange={(event) => {
                const labelId = event.target.value;
                if (!labelId) {
                  return;
                }
                setSelectedLabelIds((prev) => (prev.includes(labelId) ? prev : [...prev, labelId]));
              }}
              className="mb-2 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            >
              <option value="">ラベルを追加</option>
              {labels
                .filter((label) => !selectedLabelIds.includes(label.id))
                .map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <input
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="新しいラベル"
                className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
              <button
                type="button"
                onClick={async () => {
                  const name = newLabelName.trim();
                  if (!name) {
                    return;
                  }
                  const created = await onCreateLabel({
                    name,
                  });
                  setSelectedLabelIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
                  setNewLabelName('');
                }}
                className="rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700"
              >
                追加
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-600 hover:bg-stone-50">
            <CalendarDays className="h-4 w-4" />
            <input
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value || todayKey())}
              className="w-32 border-none bg-transparent text-sm outline-none"
              aria-label="実施日"
            />
          </label>
          <label className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-600 hover:bg-stone-50">
            <CalendarDays className="h-4 w-4" />
            <span>期限</span>
            <input
              type="date"
              value={dueDate ?? ''}
              onChange={(event) => setDueDate(event.target.value || null)}
              className="w-32 border-none bg-transparent text-sm outline-none"
              aria-label="期限"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-600">
          <Inbox className="h-4 w-4" />
          今日
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200">
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-md bg-red-400 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            タスクを追加
          </button>
        </div>
      </div>
    </form>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-40 flex items-start justify-center bg-stone-950/35 px-6 pt-24">
        {form}
      </div>
    );
  }

  return form;
}

type TaskListProps = {
  tasks: TodoTask[];
  labels: TodoLabel[];
  selectedTaskId: string | null;
  onSelectTask: (task: TodoTask) => void;
  onToggleTask: (taskId: string) => void;
  onSelectLabel: (labelId: string) => void;
  onReorder?: (sourceTaskId: string, targetTaskId: string | null) => void;
  completed?: boolean;
  emptyMessage?: string;
};

function TaskList({
  tasks,
  labels,
  selectedTaskId,
  onSelectTask,
  onToggleTask,
  onSelectLabel,
  onReorder,
  completed = false,
  emptyMessage = '表示するTODOはありません。',
}: TaskListProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [isDragOverEnd, setIsDragOverEnd] = useState(false);
  const labelMap = getLabelMap(labels);
  const canReorder = !completed && Boolean(onReorder);

  if (tasks.length === 0) {
    return <div className="border-y border-stone-100 py-6 text-sm text-stone-400">{emptyMessage}</div>;
  }

  return (
    <div className="border-t border-stone-100">
      {tasks.map((task) => {
        const isScheduledOverdue = isOverdueScheduledDate(task.scheduledDate);
        const isDueOverdue = isDueDateOverdue(task.dueDate);
        const isDragging = task.id === draggingTaskId;
        const isDragOver = task.id === dragOverTaskId;

        const isCompletedTask = completed || task.status === 'completed';

        const handleDragStart = (event: DragEvent<HTMLElement>) => {
          if (!canReorder) {
            return;
          }
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', task.id);
          // Hide browser's semi-transparent drag ghost; keep the original row as the visual cue.
          const transparentPixel = document.createElement('canvas');
          transparentPixel.width = 1;
          transparentPixel.height = 1;
          event.dataTransfer.setDragImage(transparentPixel, 0, 0);
          setDraggingTaskId(task.id);
          setIsDragOverEnd(false);
        };

        const handleDrop = (event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          const sourceTaskId = event.dataTransfer.getData('text/plain');
          if (!sourceTaskId || sourceTaskId === task.id) {
            setDragOverTaskId(null);
            return;
          }
          if (onReorder) {
            onReorder(sourceTaskId, task.id);
          }
          setDraggingTaskId(null);
          setDragOverTaskId(null);
          setIsDragOverEnd(false);
        };

        return (
          <article
            key={task.id}
            draggable={canReorder}
            onDragStart={canReorder ? handleDragStart : undefined}
            onDragOver={
              canReorder
                ? (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverTaskId(task.id);
                    setIsDragOverEnd(false);
                  }
                : undefined
            }
            onDragLeave={
              canReorder
                ? () => {
                    if (dragOverTaskId === task.id) {
                      setDragOverTaskId(null);
                    }
                  }
                : undefined
            }
            onDrop={canReorder ? handleDrop : undefined}
            onDragEnd={
              canReorder
                ? () => {
                    setDraggingTaskId(null);
                    setDragOverTaskId(null);
                    setIsDragOverEnd(false);
                  }
                : undefined
            }
            className={[
              'relative grid grid-cols-[18px_28px_1fr] gap-3 border-b border-stone-100 py-3 transition-colors',
              canReorder ? 'cursor-grab hover:bg-stone-50 active:cursor-grabbing' : 'bg-stone-100/70 hover:bg-stone-100',
              selectedTaskId === task.id ? 'bg-red-50/50' : '',
              isDragging ? 'bg-white ring-2 ring-red-300 shadow-sm' : '',
            ].join(' ')}
          >
            {canReorder && isDragOver ? (
              <>
                <span className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 bg-red-500" />
                <span className="pointer-events-none absolute -top-[5px] -left-[7px] h-3 w-3 rounded-full border-2 border-red-500 bg-white" />
              </>
            ) : null}
            <span className={['mt-0.5 flex h-5 w-5 items-center justify-center text-stone-300', canReorder ? '' : 'opacity-0'].join(' ')}>
              <GripVertical className="h-4 w-4" />
            </span>
            <button
              type="button"
              onClick={() => onToggleTask(task.id)}
              className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-stone-400 transition-colors hover:border-red-500 hover:text-red-500"
              aria-label={isCompletedTask ? 'TODOを未完了に戻す' : 'TODOを完了'}
              title={isCompletedTask ? '未完了に戻す' : '完了'}
            >
              <Circle className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onSelectTask(task)} className="min-w-0 text-left">
              <div
                className={[
                  'text-sm leading-6',
                  isCompletedTask ? 'text-stone-500 line-through' : 'text-stone-950',
                  !isCompletedTask && isScheduledOverdue ? 'font-medium text-red-700' : '',
                ].join(' ')}
              >
                {task.title}
              </div>
              {task.description ? (
                <p className={['mt-0.5 line-clamp-2 text-xs leading-5', isCompletedTask ? 'text-stone-400' : 'text-stone-500'].join(' ')}>
                  {task.description}
                </p>
              ) : null}
              <div className={['mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', isCompletedTask ? 'text-stone-400' : 'text-stone-500'].join(' ')}>
                <span
                  className={[
                    'inline-flex items-center gap-1',
                    isCompletedTask ? 'text-stone-400' : isScheduledOverdue ? 'text-red-600' : 'text-green-700',
                  ].join(' ')}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateLabel(task.scheduledDate)}
                </span>
                {task.dueDate ? (
                  <span
                    className={[
                      'inline-flex items-center gap-1',
                      isCompletedTask ? 'text-stone-400' : isDueOverdue ? 'text-red-600' : isDueToday(task.dueDate) ? 'text-green-700' : '',
                    ].join(' ')}
                  >
                    期限 {formatDateLabel(task.dueDate)}
                  </span>
                ) : null}
                {task.labelIds.map((labelId) => {
                  const label = labelMap.get(labelId);
                  if (!label) {
                    return null;
                  }
                  return (
                    <span
                      key={labelId}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectLabel(labelId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectLabel(labelId);
                        }
                      }}
                      className={['inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-stone-700 hover:brightness-95', isCompletedTask ? 'opacity-70' : ''].join(' ')}
                      style={{ backgroundColor: label.color ?? '#e7e5e4' }}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {label.name}
                    </span>
                  );
                })}
              </div>
            </button>
          </article>
        );
      })}
      {canReorder ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverTaskId(null);
            setIsDragOverEnd(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragOverEnd(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            const sourceTaskId = event.dataTransfer.getData('text/plain');
            if (sourceTaskId && onReorder) {
              onReorder(sourceTaskId, null);
            }
            setDraggingTaskId(null);
            setDragOverTaskId(null);
            setIsDragOverEnd(false);
          }}
          className={['relative h-6', isDragOverEnd ? 'bg-red-50/40' : ''].join(' ')}
          aria-hidden="true"
        >
          {isDragOverEnd ? (
            <>
              <span className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 bg-red-500" />
              <span className="pointer-events-none absolute -top-[5px] -left-[7px] h-3 w-3 rounded-full border-2 border-red-500 bg-white" />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type CompletedTaskTableProps = {
  tasks: TodoTask[];
  selectedTaskId: string | null;
  onSelectTask: (task: TodoTask) => void;
  onToggleTask: (taskId: string) => void;
};

function CompletedTaskTable({ tasks, selectedTaskId, onSelectTask, onToggleTask }: CompletedTaskTableProps) {
  if (tasks.length === 0) {
    return <div className="border-y border-stone-100 py-6 text-sm text-stone-400">完了済みのTODOはありません。</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-stone-100/70 text-left text-xs font-semibold text-stone-600">
          <tr>
            <th className="px-3 py-2">タスク名</th>
            <th className="px-3 py-2">登録日</th>
            <th className="px-3 py-2">実施予定日</th>
            <th className="px-3 py-2">期限</th>
            <th className="px-3 py-2">完了日</th>
            <th className="w-16 px-3 py-2 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={[selectedTaskId === task.id ? 'bg-red-50' : 'bg-white', 'border-t border-stone-100'].join(' ')}>
              <td className="px-3 py-2">
                <button type="button" onClick={() => onSelectTask(task)} className="truncate text-left text-stone-800 hover:text-red-700">
                  {task.title}
                </button>
              </td>
              <td className="px-3 py-2 text-stone-600">{formatTableDate(task.registeredDate)}</td>
              <td className="px-3 py-2 text-stone-600">{formatTableDate(task.scheduledDate)}</td>
              <td className="px-3 py-2 text-stone-600">{formatTableDate(task.dueDate)}</td>
              <td className="px-3 py-2 text-stone-600">{formatTableDate(task.completedDate)}</td>
              <td className="px-3 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
                >
                  戻す
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DetailPanelProps = {
  task: TodoTask;
  labels: TodoLabel[];
  saving: boolean;
  onClose: () => void;
  onUpdate: (input: Partial<TodoTask>) => Promise<void>;
  onDelete: () => void;
  onCreateLabel: (name: string) => Promise<TodoLabel>;
};

type DetailDraft = {
  title: string;
  description: string;
  scheduledDate: string;
  dueDate: string | null;
  labelIds: string[];
};

const toDetailDraft = (task: TodoTask): DetailDraft => ({
  title: task.title,
  description: task.description,
  scheduledDate: task.scheduledDate,
  dueDate: task.dueDate,
  labelIds: task.labelIds,
});

const areLabelIdsEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((labelId, index) => labelId === right[index]);

function DetailPanel({ task, labels, saving, onClose, onUpdate, onDelete, onCreateLabel }: DetailPanelProps) {
  const [newLabelName, setNewLabelName] = useState('');
  const [draft, setDraft] = useState<DetailDraft>(() => toDetailDraft(task));
  const labelMap = getLabelMap(labels);
  const hasChanges =
    draft.title !== task.title ||
    draft.description !== task.description ||
    draft.scheduledDate !== task.scheduledDate ||
    draft.dueDate !== task.dueDate ||
    !areLabelIdsEqual(draft.labelIds, task.labelIds);

  useEffect(() => {
    setDraft(toDetailDraft(task));
  }, [task]);

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-stone-950/35 px-6 py-16">
      <section className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="border-b border-stone-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-700">TODO詳細</span>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-950">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          className="space-y-5 px-6 py-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const nextTitle = draft.title.trim();
            if (!nextTitle) {
              return;
            }
            await onUpdate({
              title: nextTitle,
              description: draft.description.trim(),
              scheduledDate: draft.scheduledDate || todayKey(),
              dueDate: draft.dueDate,
              labelIds: draft.labelIds,
            });
            onClose();
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-600">タスク名</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-base text-stone-900 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-stone-600">説明</span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="説明"
              rows={4}
              className="w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm leading-6 text-stone-700 outline-none placeholder:text-stone-400 focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-600">実施日</span>
              <input
                type="date"
                value={draft.scheduledDate}
                onChange={(event) => setDraft((prev) => ({ ...prev, scheduledDate: event.target.value || todayKey() }))}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-600">期限</span>
              <input
                type="date"
                value={draft.dueDate ?? ''}
                onChange={(event) => setDraft((prev) => ({ ...prev, dueDate: event.target.value || null }))}
                className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm font-semibold text-stone-600">ラベル</span>
            <div className="mb-3 flex flex-wrap gap-2">
              {draft.labelIds.map((labelId) => {
                const label = labelMap.get(labelId);
                if (!label) {
                  return null;
                }
                return (
                  <button
                    key={labelId}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, labelIds: prev.labelIds.filter((item) => item !== labelId) }))}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-700 hover:brightness-95"
                    style={{ backgroundColor: label.color ?? '#e7e5e4' }}
                  >
                    {label.name}
                    <X className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
            <select
              value=""
              onChange={(event) => {
                const labelId = event.target.value;
                if (labelId) {
                  setDraft((prev) => ({
                    ...prev,
                    labelIds: prev.labelIds.includes(labelId) ? prev.labelIds : [...prev.labelIds, labelId],
                  }));
                }
              }}
              className="mb-2 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            >
              <option value="">ラベルを追加</option>
              {labels
                .filter((label) => !draft.labelIds.includes(label.id))
                .map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <input
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="新しいラベル"
                className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              />
              <button
                type="button"
                onClick={async () => {
                  const name = newLabelName.trim();
                  if (!name) {
                    return;
                  }
                  const label = await onCreateLabel(name);
                  setDraft((prev) => ({
                    ...prev,
                    labelIds: prev.labelIds.includes(label.id) ? prev.labelIds : [...prev.labelIds, label.id],
                  }));
                  setNewLabelName('');
                }}
                className="rounded-md bg-stone-800 px-3 py-2 text-sm text-white hover:bg-stone-700"
              >
                追加
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              type="submit"
              disabled={saving || !draft.title.trim() || !hasChanges}
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              更新
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              削除
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function TodoPage() {
  const [view, setView] = useState<TodoView>('today');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isInlineComposerOpen, setIsInlineComposerOpen] = useState(false);
  const [isModalComposerOpen, setIsModalComposerOpen] = useState(false);
  const [modalComposerDefaults, setModalComposerDefaults] = useState<{ scheduledDate: string; labelIds: string[] }>({
    scheduledDate: todayKey(),
    labelIds: [],
  });
  const [query, setQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [calendarDate, setCalendarDate] = useState(todayKey());
  const [labelDeleteTarget, setLabelDeleteTarget] = useState<TodoLabel | null>(null);
  const [deletingLabelId, setDeletingLabelId] = useState<string | null>(null);

  const tasks = useTodoStore((state) => state.tasks);
  const labels = useTodoStore((state) => state.labels);
  const loading = useTodoStore((state) => state.loading);
  const saving = useTodoStore((state) => state.saving);
  const error = useTodoStore((state) => state.error);
  const initialize = useTodoStore((state) => state.initialize);
  const createTask = useTodoStore((state) => state.createTask);
  const updateTask = useTodoStore((state) => state.updateTask);
  const reorderOpenTasks = useTodoStore((state) => state.reorderOpenTasks);
  const deleteTask = useTodoStore((state) => state.deleteTask);
  const toggleTask = useTodoStore((state) => state.toggleTask);
  const createLabel = useTodoStore((state) => state.createLabel);
  const deleteLabel = useTodoStore((state) => state.deleteLabel);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const openTasks = useMemo(() => selectOpenTasks(tasks), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'completed'), [tasks]);
  const todayTasks = useMemo(() => selectTodayTasks(tasks), [tasks]);
  const upcomingTasks = useMemo(() => selectUpcomingTasks(tasks), [tasks]);
  const calendarCounts = useMemo(() => selectCalendarCounts(tasks), [tasks]);
  const selectedLabel = labels.find((label) => label.id === selectedLabelId) ?? null;
  const upcomingDayKeys = useMemo(() => {
    const today = todayKey();
    const endDate = toDateKey(addDays(new Date(), 30));
    const keys: string[] = [];
    for (let current = today; current <= endDate; current = toDateKey(addDays(parseISO(current), 1))) {
      keys.push(current);
    }
    return keys;
  }, []);
  const upcomingTasksByDate = useMemo(() => {
    const grouped = new Map<string, TodoTask[]>();
    upcomingDayKeys.forEach((dateKey) => grouped.set(dateKey, []));
    upcomingTasks.forEach((task) => {
      if (!grouped.has(task.scheduledDate)) {
        return;
      }
      grouped.get(task.scheduledDate)?.push(task);
    });
    return grouped;
  }, [upcomingDayKeys, upcomingTasks]);

  const visibleTasks = useMemo(() => {
    const today = todayKey();
    if (view === 'today') {
      return tasks.filter((task) => task.scheduledDate <= today);
    }
    if (view === 'upcoming') {
      return upcomingTasks;
    }
    if (view === 'completed') {
      return tasks.filter((task) => task.status === 'completed');
    }
    if (view === 'label' && selectedLabelId) {
      return tasks.filter((task) => task.labelIds.includes(selectedLabelId));
    }
    if (view === 'calendar') {
      return tasks.filter((task) => task.scheduledDate === calendarDate);
    }
    if (view === 'search') {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) {
        return [];
      }
      return tasks.filter((task) =>
        `${task.title}\n${task.description}`.toLowerCase().includes(normalizedQuery)
      );
    }
    return tasks;
  }, [calendarDate, query, selectedLabelId, tasks, upcomingTasks, view]);

  const visibleOpenTasks = useMemo(() => selectOpenTasks(visibleTasks), [visibleTasks]);
  const visibleCompletedTasks = useMemo(
    () =>
      [...visibleTasks]
        .filter((task) => task.status === 'completed')
        .sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? '') || right.updatedAt.localeCompare(left.updatedAt)),
    [visibleTasks]
  );
  const completedTableTasks = useMemo(
    () =>
      [...completedTasks].sort(
        (left, right) =>
          left.scheduledDate.localeCompare(right.scheduledDate) ||
          left.registeredDate.localeCompare(right.registeredDate) ||
          left.createdAt.localeCompare(right.createdAt)
      ),
    [completedTasks]
  );

  const viewTitle = view === 'label' && selectedLabel ? selectedLabel.name : view === 'calendar' ? formatDateLabel(calendarDate) : viewTitles[view];
  const handleReorderTask = useCallback(
    async (sourceTaskId: string, targetTaskId: string | null) => {
      const sourceIndex = visibleOpenTasks.findIndex((task) => task.id === sourceTaskId);
      if (sourceIndex < 0) {
        return;
      }

      const reorderedVisibleTasks = [...visibleOpenTasks];
      const [movedTask] = reorderedVisibleTasks.splice(sourceIndex, 1);
      if (targetTaskId === null) {
        if (sourceIndex === visibleOpenTasks.length - 1) {
          return;
        }
        reorderedVisibleTasks.push(movedTask);
      } else {
        const targetIndex = visibleOpenTasks.findIndex((task) => task.id === targetTaskId);
        if (targetIndex < 0 || sourceIndex === targetIndex) {
          return;
        }
        const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        reorderedVisibleTasks.splice(insertIndex, 0, movedTask);
      }
      const reorderedVisibleIds = reorderedVisibleTasks.map((task) => task.id);
      const visibleIdSet = new Set(reorderedVisibleIds);
      let visibleCursor = 0;
      const nextOpenTaskIds = openTasks.map((task) =>
        visibleIdSet.has(task.id) ? reorderedVisibleIds[visibleCursor++] : task.id
      );
      await reorderOpenTasks(nextOpenTaskIds);
    },
    [openTasks, reorderOpenTasks, visibleOpenTasks]
  );

  const getComposerDefaults = () => ({
    scheduledDate: view === 'calendar' ? calendarDate : todayKey(),
    labelIds: view === 'label' && selectedLabelId ? [selectedLabelId] : [],
  });
  const inlineComposerDefaults = useMemo(
    () => getComposerDefaults(),
    [calendarDate, selectedLabelId, view]
  );

  const openModalComposer = (scheduledDate: string, labelIds: string[] = []) => {
    setModalComposerDefaults({ scheduledDate, labelIds });
    setIsModalComposerOpen(true);
  };

  const handleCreateTask = async (input: {
    title: string;
    description: string;
    scheduledDate: string;
    dueDate: string | null;
    labelIds: string[];
  }) => {
    await createTask(input);
    setSelectedTaskId(null);
  };

  const createAndSelectLabel = async (name: string) => createLabel({ name });

  const handleDeleteLabel = async () => {
    if (!labelDeleteTarget) {
      return;
    }
    setDeletingLabelId(labelDeleteTarget.id);
    try {
      await deleteLabel(labelDeleteTarget.id);
      if (selectedLabelId === labelDeleteTarget.id) {
        setSelectedLabelId(null);
        if (view === 'label') {
          setView('labels');
        }
      }
      setLabelDeleteTarget(null);
    } finally {
      setDeletingLabelId(null);
    }
  };

  const sidebarItemClass = (active: boolean) =>
    [
      'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
      active ? 'bg-red-50 text-red-700' : 'text-stone-700 hover:bg-stone-100',
    ].join(' ');

  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
    const cells = [];
    let day = startDate;
    while (day <= endDate) {
      const dateKey = toDateKey(day);
      const count = calendarCounts.get(dateKey) ?? 0;
      const isSelected = dateKey === calendarDate;
      cells.push(
        <button
          key={dateKey}
          type="button"
          onClick={() => {
            setCalendarDate(dateKey);
            setView('calendar');
          }}
          className={[
            'min-h-16 border border-stone-100 p-2 text-left text-sm transition-colors hover:bg-stone-50',
            !isSameMonth(day, monthStart) ? 'bg-stone-50/60 text-stone-300' : 'bg-white text-stone-700',
            isSelected ? 'border-red-200 bg-red-50 text-red-700' : '',
          ].join(' ')}
        >
          <span>{format(day, 'd')}</span>
          {count > 0 ? <span className="mt-2 block text-xs text-stone-500">{count}件</span> : null}
        </button>
      );
      day = addDays(day, 1);
    }
    return (
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setCalendarMonth(startOfMonth(addDays(calendarMonth, -1)))} className="rounded-md p-2 hover:bg-stone-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold text-stone-700">{format(calendarMonth, 'yyyy年M月', { locale: ja })}</h3>
          <button type="button" onClick={() => setCalendarMonth(startOfMonth(addDays(endOfMonth(calendarMonth), 1)))} className="rounded-md p-2 hover:bg-stone-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-400">
          {['日', '月', '火', '水', '木', '金', '土'].map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-md border border-stone-100">{cells}</div>
      </section>
    );
  };

  const renderUpcomingSchedule = () => {
    return (
      <section className="mb-8">
        <div className="space-y-8">
          {upcomingDayKeys.map((dateKey) => {
            const dayTasks = upcomingTasksByDate.get(dateKey) ?? [];
            return (
              <section key={dateKey}>
                <h3 className="mb-2 text-2xl font-semibold text-stone-800">{formatUpcomingSectionLabel(dateKey)}</h3>
                <div className="border-t border-stone-100">
                  {dayTasks.length === 0 ? (
                    <div className="border-b border-stone-100 py-4 text-sm text-stone-400">タスクはありません。</div>
                  ) : (
                    dayTasks.map((task) => {
                      const isScheduledOverdue = isOverdueScheduledDate(task.scheduledDate);
                      const isDueOverdue = isDueDateOverdue(task.dueDate);
                      return (
                        <article key={task.id} className="grid grid-cols-[28px_1fr] gap-3 border-b border-stone-100 py-3">
                          <button
                            type="button"
                            onClick={() => void toggleTask(task.id)}
                            className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 text-stone-400 transition-colors hover:border-red-500 hover:text-red-500"
                            aria-label="TODOを完了"
                            title="完了"
                          >
                            <Circle className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setSelectedTaskId(task.id)} className="min-w-0 text-left">
                            <div className={['text-sm leading-6 text-stone-950', isScheduledOverdue ? 'font-medium text-red-700' : ''].join(' ')}>
                              {task.title}
                            </div>
                            {task.description ? <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-stone-500">{task.description}</p> : null}
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                              <span className={['inline-flex items-center gap-1', isScheduledOverdue ? 'text-red-600' : 'text-green-700'].join(' ')}>
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateLabel(task.scheduledDate)}
                              </span>
                              {task.dueDate ? (
                                <span className={['inline-flex items-center gap-1', isDueOverdue ? 'text-red-600' : isDueToday(task.dueDate) ? 'text-green-700' : ''].join(' ')}>
                                  期限 {formatDateLabel(task.dueDate)}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </article>
                      );
                    })
                  )}
                  <div className="border-b border-stone-100 py-3">
                    <button
                      type="button"
                      onClick={() => openModalComposer(dateKey)}
                      className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-red-600"
                    >
                      <Plus className="h-4 w-4 text-red-500" />
                      タスクを追加
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="-mx-4 -my-8 min-h-[calc(100vh-3.5rem)] bg-white text-stone-950">
      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="サイドバーを閉じる"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-stone-950/35 md:hidden"
        />
      ) : null}
      <div className="relative min-h-[calc(100vh-3.5rem)] md:grid md:grid-cols-[260px_1fr]">
        <aside
          className={[
            'border-r border-stone-100 bg-stone-50 px-3 py-5',
            'fixed inset-y-0 left-0 z-30 w-[min(85vw,300px)] overflow-y-auto shadow-xl transition-transform md:static md:w-auto md:shadow-none',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          ].join(' ')}
        >
          <div className="mb-3 flex items-center justify-between px-1 md:hidden">
            <span className="text-sm font-semibold text-stone-600">メニュー</span>
            <button
              type="button"
              aria-label="サイドバーを閉じる"
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-md p-1 text-stone-500 hover:bg-stone-200 hover:text-stone-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setView('today');
              setSelectedLabelId(null);
              openModalComposer(todayKey(), []);
              setIsSidebarOpen(false);
            }}
            className="mb-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Plus className="h-5 w-5" />
            タスクを追加
          </button>

          <button
            type="button"
            onClick={() => {
              setView('search');
              setIsSidebarOpen(false);
            }}
            className={sidebarItemClass(view === 'search')}
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              検索
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setView('today');
              setIsSidebarOpen(false);
            }}
            className={sidebarItemClass(view === 'today')}
          >
            <span className="inline-flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              今日
            </span>
            <span className="text-xs text-stone-400">{todayTasks.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setView('upcoming');
              setIsSidebarOpen(false);
            }}
            className={sidebarItemClass(view === 'upcoming')}
          >
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              近日予定
            </span>
            <span className="text-xs text-stone-400">{upcomingTasks.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setView('completed');
              setIsSidebarOpen(false);
            }}
            className={sidebarItemClass(view === 'completed')}
          >
            <span className="inline-flex items-center gap-2">
              <Circle className="h-4 w-4" />
              完了
            </span>
            <span className="text-xs text-stone-400">{completedTasks.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setView('labels');
              setIsSidebarOpen(false);
            }}
            className={sidebarItemClass(view === 'labels')}
          >
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4" />
              ラベル
            </span>
          </button>

          <div className="mt-8 px-3 text-xs font-semibold text-stone-400">ラベル</div>
          <div className="mt-2 space-y-1">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => {
                  setSelectedLabelId(label.id);
                  setView('label');
                  setIsSidebarOpen(false);
                }}
                className={sidebarItemClass(view === 'label' && selectedLabelId === label.id)}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label.name}</span>
                </span>
                <span className="text-xs text-stone-400">{selectLabelTasks(tasks, label.id).length}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="mx-auto min-w-0 w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {error ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <header className="mb-6 flex items-center justify-between gap-3 sm:mb-7">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label="サイドバーを開く"
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-700 hover:bg-stone-100 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="hidden text-2xl font-semibold text-stone-950 md:block">{viewTitle}</h2>
              {loading ? <p className="text-sm text-stone-400 md:mt-2">読み込み中...</p> : null}
            </div>
            <button
              type="button"
              onClick={() => openModalComposer(view === 'calendar' ? calendarDate : todayKey(), view === 'label' && selectedLabelId ? [selectedLabelId] : [])}
              className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 md:hidden"
            >
              <Plus className="h-4 w-4" />
              追加
            </button>
          </header>

          {view === 'search' ? (
            <div className="mb-6 flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2">
              <Search className="h-4 w-4 text-stone-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="TODOを検索"
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
              />
            </div>
          ) : null}

          {view === 'labels' ? (
            <section className="mb-8">
              <form
                className="mb-5 flex gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const name = String(data.get('labelName') ?? '').trim();
                  if (!name) {
                    return;
                  }
                  await createLabel({ name });
                  form.reset();
                }}
              >
                <input
                  name="labelName"
                  placeholder="新しいラベル"
                  className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
                <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">
                  追加
                </button>
              </form>
              <div className="divide-y divide-stone-100 border-y border-stone-100">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLabelId(label.id);
                        setView('label');
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-stone-50"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-stone-400" />
                        <span className="truncate">{label.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">{selectLabelTasks(tasks, label.id).length}件</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelDeleteTarget(label)}
                      aria-label={`${label.name} を削除`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-200 text-stone-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {view === 'calendar' ? renderCalendar() : null}
          {view === 'upcoming' ? renderUpcomingSchedule() : null}
          {view === 'completed' ? (
            <section className="mb-8">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-700">完了タスク一覧</h3>
                <span className="text-xs text-stone-400">{completedTableTasks.length}</span>
              </div>
              <CompletedTaskTable
                tasks={completedTableTasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={(task) => setSelectedTaskId(task.id)}
                onToggleTask={(taskId) => void toggleTask(taskId)}
              />
            </section>
          ) : null}

          {view !== 'labels' && view !== 'upcoming' && view !== 'completed' ? (
            <>
              <section className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-700">未完了</h3>
                  <span className="text-xs text-stone-400">{visibleOpenTasks.length}</span>
                </div>
                <TaskList
                  tasks={visibleOpenTasks}
                  labels={labels}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={(task) => setSelectedTaskId(task.id)}
                  onToggleTask={(taskId) => void toggleTask(taskId)}
                  onSelectLabel={(labelId) => {
                    setSelectedLabelId(labelId);
                    setView('label');
                  }}
                  onReorder={(sourceTaskId, targetTaskId) => {
                    void handleReorderTask(sourceTaskId, targetTaskId);
                  }}
                  emptyMessage="未完了のTODOはありません。"
                />
              </section>

              {view !== 'today' ? (
                <section className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-stone-700">完了</h3>
                    <span className="text-xs text-stone-400">{visibleCompletedTasks.length}</span>
                  </div>
                  <TaskList
                    tasks={visibleCompletedTasks}
                    labels={labels}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={(task) => setSelectedTaskId(task.id)}
                    onToggleTask={(taskId) => void toggleTask(taskId)}
                    onSelectLabel={(labelId) => {
                      setSelectedLabelId(labelId);
                      setView('label');
                    }}
                    completed
                    emptyMessage="完了済みのTODOはありません。"
                  />
                </section>
              ) : null}
              <div className="border-b border-stone-100 py-4">
                {isInlineComposerOpen ? (
                  <AddTaskComposer
                    mode="inline"
                    saving={saving}
                    labels={labels}
                    defaultScheduledDate={inlineComposerDefaults.scheduledDate}
                    defaultLabelIds={inlineComposerDefaults.labelIds}
                    onCancel={() => setIsInlineComposerOpen(false)}
                    onCreateLabel={async (input) => createLabel(input)}
                    onCreate={async (input) => {
                      await handleCreateTask(input);
                      setIsInlineComposerOpen(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsInlineComposerOpen(true)}
                    className="flex w-full items-center gap-3 text-left text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                      <Plus className="h-4 w-4" />
                    </span>
                    タスクを追加
                  </button>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>

      {isModalComposerOpen ? (
        <AddTaskComposer
          mode="modal"
          saving={saving}
          labels={labels}
          defaultScheduledDate={modalComposerDefaults.scheduledDate}
          defaultLabelIds={modalComposerDefaults.labelIds}
          onCancel={() => setIsModalComposerOpen(false)}
          onCreateLabel={async (input) => createLabel(input)}
          onCreate={async (input) => {
            await handleCreateTask(input);
            setIsModalComposerOpen(false);
          }}
        />
      ) : null}

      {selectedTask ? (
        <DetailPanel
          task={selectedTask}
          labels={labels}
          saving={saving}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={async (input) => {
            await updateTask(selectedTask.id, input);
          }}
          onDelete={async () => {
            await deleteTask(selectedTask.id);
            setSelectedTaskId(null);
          }}
          onCreateLabel={createAndSelectLabel}
        />
      ) : null}

      {labelDeleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/35 px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900">ラベルを削除しますか？</h3>
            <p className="mt-2 text-sm text-stone-600">
              「{labelDeleteTarget.name}」を削除すると、このラベルはタスクからも外れます。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLabelDeleteTarget(null)}
                disabled={deletingLabelId === labelDeleteTarget.id}
                className="rounded-md bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteLabel()}
                disabled={deletingLabelId === labelDeleteTarget.id}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
