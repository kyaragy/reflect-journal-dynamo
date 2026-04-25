import { apiThinkingReflectionRepository } from './api/apiThinkingReflectionRepository';
import { apiTodoRepository } from './api/apiTodoRepository';
import { localStorageThinkingReflectionRepository } from './localStorageThinkingReflectionRepository';
import { localStorageTodoRepository } from './localStorageTodoRepository';
import type { ThinkingReflectionRepository } from './thinkingReflectionRepository';
import type { TodoRepository } from './todoRepository';

export type RepositoryDriver = 'localStorage' | 'api';

const resolveRepositoryDriver = (): RepositoryDriver => {
  return import.meta.env.VITE_REPOSITORY_DRIVER === 'api' ? 'api' : 'localStorage';
};

const thinkingRepositoryMap: Record<RepositoryDriver, ThinkingReflectionRepository> = {
  localStorage: localStorageThinkingReflectionRepository,
  api: apiThinkingReflectionRepository,
};

const todoRepositoryMap: Record<RepositoryDriver, TodoRepository> = {
  localStorage: localStorageTodoRepository,
  api: apiTodoRepository,
};

export const repositoryDriver = resolveRepositoryDriver();
export const thinkingReflectionRepository = thinkingRepositoryMap[repositoryDriver];
export const todoRepository = todoRepositoryMap[repositoryDriver];
