import {
  assertTodoDate,
  assertTodoLabelId,
  assertTodoTaskId,
  todoApiPaths,
  type DeleteTodoLabelResponse,
  type DeleteTodoTaskResponse,
  type GetTodoSnapshotResponse,
  type PostTodoLabelRequest,
  type PostTodoLabelResponse,
  type PostTodoReorderRequest,
  type PostTodoReorderResponse,
  type PostTodoTaskRequest,
  type PostTodoTaskResponse,
  type PutTodoLabelRequest,
  type PutTodoLabelResponse,
  type PutTodoTaskRequest,
  type PutTodoTaskResponse,
} from '../../contracts/todoApi';
import { normalizeTodoSnapshot, toDateKey, todayKey, type TodoSnapshot } from '../../domain/todo';
import { apiClient } from '../../lib/apiClient';
import type { TodoRepository, TodoSnapshotRange } from '../todoRepository';

const defaultRange = (): TodoSnapshotRange => {
  const from = todayKey();
  const to = toDateKey(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  return { from, to };
};

export const apiTodoRepository: TodoRepository = {
  async getSnapshot(range) {
    const resolvedRange = range ?? defaultRange();
    assertTodoDate(resolvedRange.from);
    assertTodoDate(resolvedRange.to);
    const response = await apiClient.get<GetTodoSnapshotResponse>(todoApiPaths.todos(resolvedRange.from, resolvedRange.to));
    return normalizeTodoSnapshot(response.data as TodoSnapshot);
  },

  async createTask(input) {
    const payload: PostTodoTaskRequest = input;
    const response = await apiClient.post<PostTodoTaskResponse>(todoApiPaths.todosRoot(), payload);
    return response.data;
  },

  async updateTask(taskId, input) {
    assertTodoTaskId(taskId);
    const payload: PutTodoTaskRequest = input;
    const response = await apiClient.put<PutTodoTaskResponse>(todoApiPaths.todoTask(taskId), payload);
    return response.data;
  },

  async reorderTasks(taskIds) {
    const payload: PostTodoReorderRequest = { taskIds };
    await apiClient.post<PostTodoReorderResponse>(todoApiPaths.todoReorder(), payload);
  },

  async deleteTask(taskId) {
    assertTodoTaskId(taskId);
    await apiClient.delete<DeleteTodoTaskResponse>(todoApiPaths.todoTask(taskId));
  },

  async createLabel(input) {
    const payload: PostTodoLabelRequest = input;
    const response = await apiClient.post<PostTodoLabelResponse>(todoApiPaths.todoLabels(), payload);
    return response.data;
  },

  async updateLabel(labelId, input) {
    assertTodoLabelId(labelId);
    const payload: PutTodoLabelRequest = input;
    const response = await apiClient.put<PutTodoLabelResponse>(todoApiPaths.todoLabel(labelId), payload);
    return response.data;
  },

  async deleteLabel(labelId) {
    assertTodoLabelId(labelId);
    await apiClient.delete<DeleteTodoLabelResponse>(todoApiPaths.todoLabel(labelId));
  },
};
