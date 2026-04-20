import {
  createEmptyTodoSnapshot,
  normalizeTodoLabel,
  normalizeTodoSnapshot,
  toDateKey,
  todayKey,
  type CreateTodoLabelInput,
  type CreateTodoTaskInput,
  type TodoLabel,
  type TodoSnapshot,
  type TodoTask,
  type UpdateTodoLabelInput,
  type UpdateTodoTaskInput,
} from '../domain/todo';
import type { TodoRepository } from './todoRepository';

const STORAGE_KEY = 'reflect-journal-todo-storage';

const createId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const readSnapshot = (): TodoSnapshot => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyTodoSnapshot();
  }

  try {
    return normalizeTodoSnapshot(JSON.parse(raw) as TodoSnapshot);
  } catch {
    return createEmptyTodoSnapshot();
  }
};

const writeSnapshot = (snapshot: TodoSnapshot) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTodoSnapshot(snapshot)));
};

const sortSnapshot = (snapshot: TodoSnapshot): TodoSnapshot => ({
  tasks: [...snapshot.tasks].sort((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
  labels: [...snapshot.labels].sort((left, right) => left.name.localeCompare(right.name, 'ja')),
});

export const localStorageTodoRepository: TodoRepository = {
  async getSnapshot(range) {
    const snapshot = sortSnapshot(readSnapshot());
    if (!range) {
      return snapshot;
    }
    return {
      ...snapshot,
      tasks: snapshot.tasks.filter((task) => task.scheduledDate >= range.from && task.scheduledDate <= range.to),
    };
  },

  async createTask(input: CreateTodoTaskInput) {
    const snapshot = readSnapshot();
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const nextSortOrder = snapshot.tasks.reduce((maxSortOrder, task) => Math.max(maxSortOrder, task.sortOrder), -1) + 1;
    const task: TodoTask = {
      id: createId(),
      title: input.title.trim(),
      description: input.description ?? '',
      registeredDate: toDateKey(nowDate),
      scheduledDate: input.scheduledDate || todayKey(),
      dueDate: input.dueDate ?? null,
      sortOrder: nextSortOrder,
      labelIds: input.labelIds ?? [],
      status: 'open',
      completedDate: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const nextSnapshot = sortSnapshot({
      ...snapshot,
      tasks: [...snapshot.tasks, task],
    });
    writeSnapshot(nextSnapshot);
    return task;
  },

  async updateTask(taskId: string, input: UpdateTodoTaskInput) {
    const snapshot = readSnapshot();
    const current = snapshot.tasks.find((task) => task.id === taskId);
    if (!current) {
      return null;
    }

    const status = input.status ?? current.status;
    const completedAt = status === 'completed' ? input.completedAt ?? current.completedAt ?? new Date().toISOString() : null;
    const updated: TodoTask = {
      ...current,
      ...input,
      title: input.title !== undefined ? input.title.trim() : current.title,
      description: input.description ?? current.description,
      dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
      completedDate: completedAt ? toDateKey(new Date(completedAt)) : null,
      completedAt,
      status,
      updatedAt: new Date().toISOString(),
    };

    const nextSnapshot = sortSnapshot({
      ...snapshot,
      tasks: snapshot.tasks.map((task) => (task.id === taskId ? updated : task)),
    });
    writeSnapshot(nextSnapshot);
    return updated;
  },

  async reorderTasks(taskIds: string[]) {
    const snapshot = readSnapshot();
    const sortOrderMap = new Map(taskIds.map((taskId, index) => [taskId, index]));
    const now = new Date().toISOString();

    const nextSnapshot = sortSnapshot({
      ...snapshot,
      tasks: snapshot.tasks.map((task) => {
        const sortOrder = sortOrderMap.get(task.id);
        if (sortOrder === undefined) {
          return task;
        }
        return {
          ...task,
          sortOrder,
          updatedAt: now,
        };
      }),
    });
    writeSnapshot(nextSnapshot);
  },

  async deleteTask(taskId: string) {
    const snapshot = readSnapshot();
    writeSnapshot({
      ...snapshot,
      tasks: snapshot.tasks.filter((task) => task.id !== taskId),
    });
  },

  async createLabel(input: CreateTodoLabelInput) {
    const snapshot = readSnapshot();
    const now = new Date().toISOString();
    const label: TodoLabel = normalizeTodoLabel({
      id: createId(),
      name: input.name.trim(),
      color: input.color ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const nextSnapshot = sortSnapshot({
      ...snapshot,
      labels: [...snapshot.labels, label],
    });
    writeSnapshot(nextSnapshot);
    return label;
  },

  async updateLabel(labelId: string, input: UpdateTodoLabelInput) {
    const snapshot = readSnapshot();
    const current = snapshot.labels.find((label) => label.id === labelId);
    if (!current) {
      return null;
    }

    const updated: TodoLabel = normalizeTodoLabel({
      ...current,
      ...input,
      name: input.name !== undefined ? input.name.trim() : current.name,
      color: input.color === undefined ? current.color : input.color,
      updatedAt: new Date().toISOString(),
    });

    const nextSnapshot = sortSnapshot({
      ...snapshot,
      labels: snapshot.labels.map((label) => (label.id === labelId ? updated : label)),
    });
    writeSnapshot(nextSnapshot);
    return updated;
  },

  async deleteLabel(labelId: string) {
    const snapshot = readSnapshot();
    writeSnapshot({
      labels: snapshot.labels.filter((label) => label.id !== labelId),
      tasks: snapshot.tasks.map((task) => ({
        ...task,
        labelIds: task.labelIds.filter((currentLabelId) => currentLabelId !== labelId),
        updatedAt: new Date().toISOString(),
      })),
    });
  },
};
