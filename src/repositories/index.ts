import { apiAiJournalRepository } from './api/apiAiJournalRepository';
import { apiOneOnOneRepository } from './api/apiOneOnOneRepository';
import { apiThinkingReflectionRepository } from './api/apiThinkingReflectionRepository';
import { apiTodoRepository } from './api/apiTodoRepository';
import { localStorageAiJournalRepository } from './localStorageAiJournalRepository';
import { localStorageThinkingReflectionRepository } from './localStorageThinkingReflectionRepository';
import { localStorageOneOnOneRepository } from './localStorageOneOnOneRepository';
import { localStorageTodoRepository } from './localStorageTodoRepository';
import type { AiJournalRepository } from './aiJournalRepository';
import type { OneOnOneRepository } from './oneOnOneRepository';
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

const aiJournalRepositoryMap: Record<RepositoryDriver, AiJournalRepository> = {
  localStorage: localStorageAiJournalRepository,
  api: apiAiJournalRepository,
};

const oneOnOneRepositoryMap: Record<RepositoryDriver, OneOnOneRepository> = {
  localStorage: localStorageOneOnOneRepository,
  api: apiOneOnOneRepository,
};

const todoRepositoryMap: Record<RepositoryDriver, TodoRepository> = {
  localStorage: localStorageTodoRepository,
  api: apiTodoRepository,
};

export const repositoryDriver = resolveRepositoryDriver();
export const aiJournalRepository = aiJournalRepositoryMap[repositoryDriver];
export const oneOnOneRepository = oneOnOneRepositoryMap[repositoryDriver];
export const thinkingReflectionRepository = thinkingRepositoryMap[repositoryDriver];
export const todoRepository = todoRepositoryMap[repositoryDriver];
