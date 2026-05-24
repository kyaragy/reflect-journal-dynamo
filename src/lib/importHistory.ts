export type ImportHistoryScope = 'daily' | 'weekly' | 'monthly';

export type ImportHistoryRecord = {
  id: string;
  scope: ImportHistoryScope;
  target: string;
  success: boolean;
  message: string;
  createdAt: string;
};

const STORAGE_KEY = 'reflect-journal-import-history-v1';
const MAX_RECORDS = 30;

const readHistory = (): ImportHistoryRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ImportHistoryRecord[]) : [];
  } catch {
    return [];
  }
};

const writeHistory = (records: ImportHistoryRecord[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
};

export const appendImportHistory = (input: Omit<ImportHistoryRecord, 'id' | 'createdAt'>) => {
  const next: ImportHistoryRecord = {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `import-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const current = readHistory();
  writeHistory([next, ...current]);
};

export const getImportHistory = (scope: ImportHistoryScope, target: string) =>
  readHistory().filter((item) => item.scope === scope && item.target === target).slice(0, 8);

