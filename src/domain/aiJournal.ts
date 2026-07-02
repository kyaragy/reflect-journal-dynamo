import { format, parseISO } from 'date-fns';
import { createEmptyBookProperties, normalizeBookProperties, type BookProperties } from './book';

export const AI_NOTE_TYPE_ORDER = [
  'Journal',
  'Book',
  'Movie',
  'Live',
  'Work',
  'Free',
  'OneOnOneSummary',
] as const;

export type BaseAiNoteType = (typeof AI_NOTE_TYPE_ORDER)[number];
export type AiNoteType = BaseAiNoteType | '';

export type AiJournalNote = {
  id: string;
  type: AiNoteType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string;
  oneOnOneRunIds: string[];
  relatedSummaryIds: string[];
  sourceRunId?: string;
  targetNoteIds?: string[];
  contextSummaryIds?: string[];
  discussedThemes?: string[];
  notableQuotes?: string[];
  insights?: string[];
  nextActions?: string[];
  changesSincePrevious?: string[];
  continuingThemes?: string[];
  newThemes?: string[];
  nextQuestions?: string[];
  book?: BookProperties;
};

export type AiJournalSnapshot = {
  notes: AiJournalNote[];
};

export type CreateAiJournalNoteInput = {
  type: Exclude<AiNoteType, 'OneOnOneSummary'>;
};

export type UpdateAiJournalNoteInput = {
  type: AiNoteType;
  title: string;
  content: string;
};

export const AI_JOURNAL_CREATABLE_TYPES = AI_NOTE_TYPE_ORDER.filter((type) => type !== 'OneOnOneSummary');

export const createEmptyAiJournalSnapshot = (): AiJournalSnapshot => ({
  notes: [],
});

export const formatAiNoteTypeLabel = (type: AiNoteType) => {
  if (type === '') {
    return '未設定';
  }

  switch (type) {
    case 'Journal':
      return 'Journal';
    case 'Book':
      return 'Book';
    case 'Movie':
      return 'Movie';
    case 'Live':
      return 'Live';
    case 'Work':
      return 'Work';
    case 'Free':
      return 'Free';
    case 'OneOnOneSummary':
      return '1on1サマリ';
  }
};

export const createDefaultTitleForAiNoteType = (type: Exclude<AiNoteType, 'OneOnOneSummary'>) => {
  if (type === 'Journal') {
    return format(new Date(), 'yyyy-MM-dd');
  }
  return '';
};

export const sortAiJournalNotes = (notes: AiJournalNote[]) =>
  [...notes].sort((left, right) => {
    const leftOrder = left.type === '' ? -1 : AI_NOTE_TYPE_ORDER.indexOf(left.type);
    const rightOrder = right.type === '' ? -1 : AI_NOTE_TYPE_ORDER.indexOf(right.type);
    const typeOrder = leftOrder - rightOrder;
    if (typeOrder !== 0) {
      return typeOrder;
    }

    if (left.type === 'Journal' && right.type === 'Journal') {
      return right.title.localeCompare(left.title) || right.updatedAt.localeCompare(left.updatedAt);
    }

    return right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title, 'ja');
  });

export const normalizeAiJournalNote = (note: AiJournalNote): AiJournalNote => ({
  ...note,
  title: note.title ?? '',
  content: note.content ?? '',
  oneOnOneRunIds: Array.isArray(note.oneOnOneRunIds) ? note.oneOnOneRunIds : [],
  relatedSummaryIds: Array.isArray(note.relatedSummaryIds) ? note.relatedSummaryIds : [],
  targetNoteIds: Array.isArray(note.targetNoteIds) ? note.targetNoteIds : [],
  contextSummaryIds: Array.isArray(note.contextSummaryIds) ? note.contextSummaryIds : [],
  discussedThemes: Array.isArray(note.discussedThemes) ? note.discussedThemes : [],
  notableQuotes: Array.isArray(note.notableQuotes) ? note.notableQuotes : [],
  insights: Array.isArray(note.insights) ? note.insights : [],
  nextActions: Array.isArray(note.nextActions) ? note.nextActions : [],
  changesSincePrevious: Array.isArray(note.changesSincePrevious) ? note.changesSincePrevious : [],
  continuingThemes: Array.isArray(note.continuingThemes) ? note.continuingThemes : [],
  newThemes: Array.isArray(note.newThemes) ? note.newThemes : [],
  nextQuestions: Array.isArray(note.nextQuestions) ? note.nextQuestions : [],
  book: normalizeBookProperties(note.book ?? createEmptyBookProperties()),
  updatedAt: note.updatedAt ?? note.lastSavedAt ?? note.createdAt,
  lastSavedAt: note.lastSavedAt ?? note.updatedAt ?? note.createdAt,
});

export const normalizeAiJournalSnapshot = (snapshot: AiJournalSnapshot): AiJournalSnapshot => ({
  notes: Array.isArray(snapshot.notes) ? sortAiJournalNotes(snapshot.notes.map(normalizeAiJournalNote)) : [],
});

export const resolveJournalMonthLabel = (note: AiJournalNote) => {
  const titleDate = parseISO(note.title);
  if (!Number.isNaN(titleDate.getTime())) {
    return format(titleDate, 'yyyy年M月');
  }

  const createdDate = parseISO(note.createdAt);
  if (!Number.isNaN(createdDate.getTime())) {
    return format(createdDate, 'yyyy年M月');
  }

  return '未分類';
};
