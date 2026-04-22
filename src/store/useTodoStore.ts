import { create } from 'zustand';
import {
  toDateKey,
  todayKey,
  type CreateTodoLabelInput,
  type CreateTodoTaskInput,
  type TodoLabel,
  type TodoTask,
  type UpdateTodoLabelInput,
  type UpdateTodoTaskInput,
} from '../domain/todo';
import { todoRepository } from '../repositories';

type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';

type TodoState = {
  tasks: TodoTask[];
  labels: TodoLabel[];
  loading: boolean;
  saving: boolean;
  initialLoadStatus: AsyncStatus;
  error: string | null;
  initialize: () => Promise<void>;
  createTask: (input: CreateTodoTaskInput) => Promise<TodoTask>;
  updateTask: (taskId: string, input: UpdateTodoTaskInput) => Promise<TodoTask | null>;
  reorderOpenTasks: (orderedTaskIds: string[]) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  createLabel: (input: CreateTodoLabelInput) => Promise<TodoLabel>;
  updateLabel: (labelId: string, input: UpdateTodoLabelInput) => Promise<TodoLabel | null>;
  deleteLabel: (labelId: string) => Promise<void>;
};

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

const sortTasks = (tasks: TodoTask[]) =>
  [...tasks].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === 'open' ? -1 : 1;
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });

export const selectOpenTasks = (tasks: TodoTask[]) => sortTasks(tasks.filter((task) => task.status === 'open'));

export const selectTodayTasks = (tasks: TodoTask[]) => {
  const today = todayKey();
  return selectOpenTasks(tasks).filter((task) => task.scheduledDate <= today);
};

export const selectUpcomingTasks = (tasks: TodoTask[]) => {
  const today = todayKey();
  return selectOpenTasks(tasks).filter((task) => task.scheduledDate >= today);
};

export const selectLabelTasks = (tasks: TodoTask[], labelId: string) =>
  selectOpenTasks(tasks).filter((task) => task.labelIds.includes(labelId));

export const selectCalendarCounts = (tasks: TodoTask[]) => {
  const counts = new Map<string, number>();
  selectOpenTasks(tasks).forEach((task) => {
    counts.set(task.scheduledDate, (counts.get(task.scheduledDate) ?? 0) + 1);
  });
  return counts;
};

const withSaving = async <T>(
  set: (fn: (state: TodoState) => Partial<TodoState>) => void,
  work: () => Promise<T>
) => {
  set(() => ({ saving: true, error: null }));

  try {
    const result = await work();
    set(() => ({ saving: false }));
    return result;
  } catch (error) {
    set(() => ({ saving: false, error: toErrorMessage(error) }));
    throw error;
  }
};

export const useTodoStore = create<TodoState>()((set, get) => ({
  tasks: [],
  labels: [],
  loading: false,
  saving: false,
  initialLoadStatus: 'idle',
  error: null,

  async initialize() {
    if (get().initialLoadStatus === 'loading' || get().initialLoadStatus === 'ready') {
      return;
    }

    set(() => ({ loading: true, error: null, initialLoadStatus: 'loading' }));

    try {
      const from = '1970-01-01';
      const to = toDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      const snapshot = await todoRepository.getSnapshot({ from, to });
      set(() => ({
        tasks: sortTasks(snapshot.tasks),
        labels: snapshot.labels,
        loading: false,
        initialLoadStatus: 'ready',
      }));
    } catch (error) {
      set(() => ({
        loading: false,
        initialLoadStatus: 'error',
        error: toErrorMessage(error),
      }));
    }
  },

  async createTask(input) {
    return withSaving(set, async () => {
      const task = await todoRepository.createTask(input);
      set((state) => ({ tasks: sortTasks([...state.tasks, task]) }));
      return task;
    });
  },

  async updateTask(taskId, input) {
    return withSaving(set, async () => {
      const task = await todoRepository.updateTask(taskId, input);
      if (task) {
        set((state) => ({ tasks: sortTasks(state.tasks.map((item) => (item.id === taskId ? task : item))) }));
      }
      return task;
    });
  },

  async deleteTask(taskId) {
    await withSaving(set, async () => {
      await todoRepository.deleteTask(taskId);
      set((state) => ({ tasks: state.tasks.filter((task) => task.id !== taskId) }));
    });
  },

  async reorderOpenTasks(orderedTaskIds) {
    await withSaving(set, async () => {
      const sortOrderMap = new Map(orderedTaskIds.map((taskId, index) => [taskId, index]));
      const now = new Date().toISOString();
      set((state) => ({
        tasks: sortTasks(
          state.tasks.map((task) => {
            const sortOrder = sortOrderMap.get(task.id);
            if (task.status !== 'open' || sortOrder === undefined) {
              return task;
            }
            return {
              ...task,
              sortOrder,
              updatedAt: now,
            };
          })
        ),
      }));
      await todoRepository.reorderTasks(orderedTaskIds);
    });
  },

  async toggleTask(taskId) {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task) {
      return;
    }

    await get().updateTask(taskId, {
      status: task.status === 'completed' ? 'open' : 'completed',
      completedAt: task.status === 'completed' ? null : new Date().toISOString(),
    });
  },

  async createLabel(input) {
    return withSaving(set, async () => {
      const label = await todoRepository.createLabel(input);
      set((state) => ({ labels: [...state.labels, label].sort((left, right) => left.name.localeCompare(right.name, 'ja')) }));
      return label;
    });
  },

  async updateLabel(labelId, input) {
    return withSaving(set, async () => {
      const label = await todoRepository.updateLabel(labelId, input);
      if (label) {
        set((state) => ({
          labels: state.labels.map((item) => (item.id === labelId ? label : item)).sort((left, right) => left.name.localeCompare(right.name, 'ja')),
        }));
      }
      return label;
    });
  },

  async deleteLabel(labelId) {
    await withSaving(set, async () => {
      await todoRepository.deleteLabel(labelId);
      set((state) => ({
        labels: state.labels.filter((label) => label.id !== labelId),
        tasks: state.tasks.map((task) => ({
          ...task,
          labelIds: task.labelIds.filter((currentLabelId) => currentLabelId !== labelId),
        })),
      }));
    });
  },
}));
