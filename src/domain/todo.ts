import { addDays, format, isBefore, parseISO, startOfDay } from 'date-fns';

export type TodoStatus = 'open' | 'completed';

export type TodoTask = {
  id: string;
  title: string;
  description: string;
  registeredDate: string;
  scheduledDate: string;
  dueDate: string | null;
  sortOrder: number;
  labelIds: string[];
  status: TodoStatus;
  completedDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoLabel = {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoSnapshot = {
  tasks: TodoTask[];
  labels: TodoLabel[];
};

export type CreateTodoTaskInput = {
  title: string;
  description?: string;
  scheduledDate?: string;
  dueDate?: string | null;
  labelIds?: string[];
};

export type UpdateTodoTaskInput = Partial<Omit<TodoTask, 'id' | 'createdAt' | 'updatedAt'>>;

export type CreateTodoLabelInput = {
  name: string;
  color?: string | null;
};

export type UpdateTodoLabelInput = Partial<Omit<TodoLabel, 'id' | 'createdAt' | 'updatedAt'>>;

export type TodoView = 'today' | 'upcoming' | 'labels' | 'label' | 'calendar' | 'search' | 'all';

export const createEmptyTodoSnapshot = (): TodoSnapshot => ({
  tasks: [],
  labels: [],
});

export const todayKey = () => format(new Date(), 'yyyy-MM-dd');

export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export const getUpcomingDateKeys = (baseDate = new Date()) =>
  [0, 1, 2].map((offset) => toDateKey(addDays(baseDate, offset)));

export const isOverdueScheduledDate = (scheduledDate: string, baseDate = new Date()) =>
  isBefore(startOfDay(parseISO(scheduledDate)), startOfDay(baseDate));

export const isDueDateOverdue = (dueDate: string | null, baseDate = new Date()) =>
  Boolean(dueDate && isBefore(startOfDay(parseISO(dueDate)), startOfDay(baseDate)));

export const isDueToday = (dueDate: string | null, baseDate = new Date()) => dueDate === toDateKey(baseDate);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const labelColorPalette = ['#fee2e2', '#ffedd5', '#fef3c7', '#dcfce7', '#dbeafe', '#e0e7ff', '#f3e8ff', '#fce7f3'];

const isDateKey = (value: string | null | undefined): value is string => Boolean(value && DATE_PATTERN.test(value));

const isoToDateKey = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return toDateKey(parsed);
};

export const pickTodoLabelColor = (name: string) =>
  labelColorPalette[[...name].reduce((hash, char) => hash + char.charCodeAt(0), 0) % labelColorPalette.length];

export const normalizeTodoTask = (value: TodoTask): TodoTask => ({
  ...value,
  description: value.description ?? '',
  registeredDate: isDateKey(value.registeredDate) ? value.registeredDate : isoToDateKey(value.createdAt) ?? todayKey(),
  scheduledDate: value.scheduledDate || todayKey(),
  dueDate: value.dueDate ?? null,
  sortOrder: Number.isFinite(value.sortOrder) ? value.sortOrder : Number.MAX_SAFE_INTEGER,
  labelIds: Array.isArray(value.labelIds) ? value.labelIds : [],
  status: value.status === 'completed' ? 'completed' : 'open',
  completedDate:
    value.status === 'completed'
      ? isDateKey(value.completedDate)
        ? value.completedDate
        : isoToDateKey(value.completedAt)
      : null,
  completedAt: value.completedAt ?? null,
});

export const normalizeTodoLabel = (value: TodoLabel): TodoLabel => ({
  ...value,
  color: value.color ?? pickTodoLabelColor(value.name),
});

export const normalizeTodoSnapshot = (snapshot: TodoSnapshot): TodoSnapshot => {
  const tasks = Array.isArray(snapshot.tasks)
    ? snapshot.tasks.map((task, index) => {
        const normalized = normalizeTodoTask(task);
        return {
          ...normalized,
          sortOrder: normalized.sortOrder === Number.MAX_SAFE_INTEGER ? index : normalized.sortOrder,
        };
      })
    : [];

  return {
    tasks,
    labels: Array.isArray(snapshot.labels) ? snapshot.labels.map(normalizeTodoLabel) : [],
  };
};
