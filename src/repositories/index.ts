import type { JournalRepository } from './journalRepository';
import { apiRepository } from './api/apiRepository';
import { localStorageRepository } from './localStorageRepository';

export type RepositoryDriver = 'localStorage' | 'api';

const resolveRepositoryDriver = (): RepositoryDriver => {
  return import.meta.env.VITE_REPOSITORY_DRIVER === 'api' ? 'api' : 'localStorage';
};

const repositoryMap: Record<RepositoryDriver, JournalRepository> = {
  localStorage: localStorageRepository,
  api: apiRepository,
};

export const journalRepositoryDriver = resolveRepositoryDriver();

export const journalRepository = repositoryMap[journalRepositoryDriver];
