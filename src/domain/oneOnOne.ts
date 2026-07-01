import { format, parseISO } from 'date-fns';
import { resolveJournalMonthLabel, type AiJournalNote } from './aiJournal';

export type OneOnOneRunStatus = 'prompt_created' | 'summarized';

export type OneOnOneRun = {
  id: string;
  createdAt: string;
  targetNoteIds: string[];
  contextSummaryIds: string[];
  promptText: string;
  summaryNoteId?: string;
  status: OneOnOneRunStatus;
};

export type OneOnOneSnapshot = {
  runs: OneOnOneRun[];
};

export type ImportedOneOnOneSummary = {
  schemaVersion: '1.0';
  type: '1on1Summary';
  runId: string;
  targetNoteIds: string[];
  contextSummaryIds: string[];
  summary: {
    title: string;
    markdown: string;
  };
  changesSincePrevious: string[];
  continuingThemes: string[];
  newThemes: string[];
  nextQuestions: string[];
};

export type ImportOneOnOneSummaryInput = ImportedOneOnOneSummary;

export const createEmptyOneOnOneSnapshot = (): OneOnOneSnapshot => ({
  runs: [],
});

export const sortOneOnOneRuns = (runs: OneOnOneRun[]) =>
  [...runs].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const normalizeOneOnOneRun = (run: OneOnOneRun): OneOnOneRun => ({
  ...run,
  targetNoteIds: Array.isArray(run.targetNoteIds) ? run.targetNoteIds : [],
  contextSummaryIds: Array.isArray(run.contextSummaryIds) ? run.contextSummaryIds : [],
  promptText: run.promptText ?? '',
  status: run.status === 'summarized' ? 'summarized' : 'prompt_created',
});

export const normalizeOneOnOneSnapshot = (snapshot: OneOnOneSnapshot): OneOnOneSnapshot => ({
  runs: Array.isArray(snapshot.runs) ? sortOneOnOneRuns(snapshot.runs.map(normalizeOneOnOneRun)) : [],
});

const formatNoteBlock = (note: AiJournalNote) => {
  if (note.type === 'Book') {
    return [
      `### Note`,
      `- noteId: ${note.id}`,
      `- type: ${note.type}`,
      `- title: ${note.book?.officialTitle || note.title || '(untitled)'}`,
      `- author: ${note.book?.author || '(unknown)'}`,
      `- readingStartedOn: ${note.book?.readingStartedOn || '(null)'}`,
      `- readingFinishedOn: ${note.book?.readingFinishedOn || '(null)'}`,
      '',
      note.content || '(empty)',
    ].join('\n');
  }

  return [
    `### Note`,
    `- noteId: ${note.id}`,
    `- type: ${note.type}`,
    `- title: ${note.title || '(untitled)'}`,
    '',
    note.content || '(empty)',
  ].join('\n');
};

const formatSummaryBlock = (note: AiJournalNote) => {
  return [
    `### Summary`,
    `- summaryNoteId: ${note.id}`,
    `- title: ${note.title || '(untitled)'}`,
    '',
    note.content || '(empty)',
  ].join('\n');
};

export const buildOneOnOnePrompt = (runId: string, targetNotes: AiJournalNote[], contextNotes: AiJournalNote[]) => {
  const targetNoteIds = targetNotes.map((note) => note.id);
  const contextSummaryIds = contextNotes.map((note) => note.id);
  const latestSummaryMonth =
    contextNotes.length > 0
      ? resolveJournalMonthLabel({
          ...contextNotes[0],
          title: contextNotes[0].createdAt,
        })
      : null;

  return [
    '# 1on1の進め方',
    '- 基本的に質問は1つずつ行ってください。',
    '- レポート形式で大量出力せず、対話を優先してください。',
    '- ユーザーの話したいテーマを優先してください。',
    '- 複数メモにまたがる共通テーマ、継続テーマ、変化を考慮してください。',
    '- Bookノートが対象に含まれる場合は、読書の進捗、印象に残った学び、仕事や日常への接続を会話の中で確認してください。',
    '- ユーザーが終了を宣言するまで対話を継続してください。',
    '',
    '# 1on1終了時の出力要件',
    '- 最後にJSONのみを出力してください。',
    '- schemaVersion は "1.0" を使ってください。',
    '- type は "1on1Summary" を使ってください。',
    '- runId は以下の値をそのまま使用してください。',
    '',
    '# メタ情報',
    `- runId: ${runId}`,
    `- targetNoteIds: ${JSON.stringify(targetNoteIds)}`,
    `- contextSummaryIds: ${JSON.stringify(contextSummaryIds)}`,
    latestSummaryMonth ? `- latestContextMonth: ${latestSummaryMonth}` : '- latestContextMonth: none',
    '',
    '# 今回の対象メモ',
    ...(targetNotes.length > 0
      ? targetNotes.flatMap((note) => [formatNoteBlock(note), ''])
      : ['(none)', '']),
    '# 過去の1on1まとめ',
    ...(contextNotes.length > 0
      ? contextNotes.flatMap((note) => [formatSummaryBlock(note), ''])
      : ['(none)', '']),
    '# JSON schema',
    '```json',
    JSON.stringify(
      {
        schemaVersion: '1.0',
        type: '1on1Summary',
        runId,
        targetNoteIds: [],
        contextSummaryIds: [],
        summary: {
          title: '',
          markdown: '',
        },
        changesSincePrevious: [],
        continuingThemes: [],
        newThemes: [],
        nextQuestions: [],
      },
      null,
      2
    ),
    '```',
  ].join('\n');
};

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

export const parseImportedOneOnOneSummary = (value: string): ImportedOneOnOneSummary => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('JSONの解析に失敗しました。');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSONの形式が不正です。');
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.schemaVersion !== '1.0') {
    throw new Error('schemaVersion は "1.0" である必要があります。');
  }

  if (candidate.type !== '1on1Summary' && candidate.type !== 'oneOnOneSummary') {
    throw new Error('type は "1on1Summary" である必要があります。');
  }

  if (typeof candidate.runId !== 'string' || candidate.runId.length === 0) {
    throw new Error('runId が不正です。');
  }

  if (!isStringArray(candidate.targetNoteIds)) {
    throw new Error('targetNoteIds は文字列配列である必要があります。');
  }

  if (!isStringArray(candidate.contextSummaryIds)) {
    throw new Error('contextSummaryIds は文字列配列である必要があります。');
  }

  if (!candidate.summary || typeof candidate.summary !== 'object') {
    throw new Error('summary が不正です。');
  }

  const summary = candidate.summary as Record<string, unknown>;
  if (typeof summary.title !== 'string' || typeof summary.markdown !== 'string') {
    throw new Error('summary.title と summary.markdown は文字列である必要があります。');
  }

  const changesSincePrevious = isStringArray(candidate.changesSincePrevious) ? candidate.changesSincePrevious : [];
  const continuingThemes = isStringArray(candidate.continuingThemes) ? candidate.continuingThemes : [];
  const newThemes = isStringArray(candidate.newThemes) ? candidate.newThemes : [];
  const nextQuestions = isStringArray(candidate.nextQuestions) ? candidate.nextQuestions : [];

  return {
    schemaVersion: '1.0',
    type: '1on1Summary',
    runId: candidate.runId,
    targetNoteIds: candidate.targetNoteIds,
    contextSummaryIds: candidate.contextSummaryIds,
    summary: {
      title: summary.title,
      markdown: summary.markdown,
    },
    changesSincePrevious,
    continuingThemes,
    newThemes,
    nextQuestions,
  };
};

export const createOneOnOneRunId = (date = new Date(), sequence = 1) =>
  `oneonone-${format(date, 'yyyyMMdd')}-${String(sequence).padStart(3, '0')}`;

export const formatOneOnOneRunDateTime = (value: string) => {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};
