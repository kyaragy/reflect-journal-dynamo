import type {
  CreateTodoLabelInput,
  CreateTodoTaskInput,
  TodoLabel,
  TodoSnapshot,
  TodoTask,
  UpdateTodoLabelInput,
  UpdateTodoTaskInput,
} from '../domain/todo';
import type { ApiSuccessResponse } from './journalApi';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: string) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const assertTodoDate = (value: string) => {
  if (!isValidDate(value)) {
    throw new Error('Invalid date: expected YYYY-MM-DD');
  }
};

export const assertTodoTaskId = (taskId: string) => {
  if (!taskId.trim()) {
    throw new Error('Invalid taskId: expected non-empty string');
  }
};

export const assertTodoLabelId = (labelId: string) => {
  if (!labelId.trim()) {
    throw new Error('Invalid labelId: expected non-empty string');
  }
};

export type GetTodoSnapshotResponse = ApiSuccessResponse<TodoSnapshot>;
export type PostTodoTaskRequest = CreateTodoTaskInput;
export type PostTodoTaskResponse = ApiSuccessResponse<TodoTask>;
export type PutTodoTaskRequest = UpdateTodoTaskInput;
export type PutTodoTaskResponse = ApiSuccessResponse<TodoTask | null>;
export type PostTodoReorderRequest = { taskIds: string[] };
export type PostTodoReorderResponse = ApiSuccessResponse<{ reordered: true }>;
export type DeleteTodoTaskResponse = ApiSuccessResponse<{ deleted: true }>;

export type PostTodoLabelRequest = CreateTodoLabelInput;
export type PostTodoLabelResponse = ApiSuccessResponse<TodoLabel>;
export type PutTodoLabelRequest = UpdateTodoLabelInput;
export type PutTodoLabelResponse = ApiSuccessResponse<TodoLabel | null>;
export type DeleteTodoLabelResponse = ApiSuccessResponse<{ deleted: true }>;

export const todoApiPaths = {
  todosRoot: () => '/todos',
  todos: (from: string, to: string) => `/todos?from=${from}&to=${to}`,
  todoTask: (taskId: string) => `/todos/${taskId}`,
  todoReorder: () => '/todos/reorder',
  todoLabels: () => '/todo-labels',
  todoLabel: (labelId: string) => `/todo-labels/${labelId}`,
} as const;
