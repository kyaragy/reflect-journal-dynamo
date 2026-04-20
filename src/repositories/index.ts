import type { JournalRepository } from './journalRepository';
import { apiRepository } from './api/apiRepository';
import { apiThinkingReflectionRepository } from './api/apiThinkingReflectionRepository';
import { apiTodoRepository } from './api/apiTodoRepository';
import { localStorageRepository } from './localStorageRepository';
import { localStorageThinkingReflectionRepository } from './localStorageThinkingReflectionRepository';
import { localStorageTodoRepository } from './localStorageTodoRepository';
import type { ThinkingReflectionRepository } from './thinkingReflectionRepository';
import type { TodoRepository } from './todoRepository';

export type RepositoryDriver = 'localStorage' | 'api';

const resolveRepositoryDriver = (): RepositoryDriver => {
  return import.meta.env.VITE_REPOSITORY_DRIVER === 'api' ? 'api' : 'localStorage';
};

const repositoryMap: Record<RepositoryDriver, JournalRepository> = {
  localStorage: localStorageRepository,
  api: apiRepository,
};

const thinkingRepositoryMap: Record<RepositoryDriver, ThinkingReflectionRepository> = {
  localStorage: localStorageThinkingReflectionRepository,
  api: apiThinkingReflectionRepository,
};

const todoRepositoryMap: Record<RepositoryDriver, TodoRepository> = {
  localStorage: localStorageTodoRepository,
  api: apiTodoRepository,
};

export const journalRepositoryDriver = resolveRepositoryDriver();

export const journalRepository = repositoryMap[journalRepositoryDriver];
export const thinkingReflectionRepository = thinkingRepositoryMap[journalRepositoryDriver];
export const todoRepository = todoRepositoryMap[journalRepositoryDriver];
