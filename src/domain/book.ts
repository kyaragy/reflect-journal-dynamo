export type BookProperties = {
  officialTitle: string;
  author: string;
  publisher: string;
  publishedYear: string;
  readingStartedOn: string;
  readingFinishedOn: string;
  isbn: string;
  genre: string;
  themes: string[];
};

export type ImportedBookProperties = {
  schemaVersion: '1.0';
  type: 'bookProperties';
  noteId: string;
  book: BookProperties;
};

export const createEmptyBookProperties = (): BookProperties => ({
  officialTitle: '',
  author: '',
  publisher: '',
  publishedYear: '',
  readingStartedOn: '',
  readingFinishedOn: '',
  isbn: '',
  genre: '',
  themes: [],
});

export const normalizeBookProperties = (value: BookProperties | undefined): BookProperties => ({
  officialTitle: value?.officialTitle ?? '',
  author: value?.author ?? '',
  publisher: value?.publisher ?? '',
  publishedYear: value?.publishedYear ?? '',
  readingStartedOn: value?.readingStartedOn ?? '',
  readingFinishedOn: value?.readingFinishedOn ?? '',
  isbn: value?.isbn ?? '',
  genre: value?.genre ?? '',
  themes: Array.isArray(value?.themes) ? value!.themes.filter((theme) => typeof theme === 'string') : [],
});

export const buildBookPropertiesPrompt = (noteId: string, title: string, content: string) =>
  (currentBook?: BookProperties) =>
  [
    '# 書籍情報特定の依頼',
    '- 以下の Book ノート本文、ノートタイトル、現在入力されている書籍情報を手がかりに、対象書籍を特定してください。',
    '- 正確なタイトル名、著者名、出版社、出版年、ISBN、ジャンル、テーマを分かる範囲で補完・訂正してください。',
    '- 現在の情報が不正確でも、確信がある場合だけ訂正してください。',
    '- 確信が持てない項目は推測で埋めず、空文字または空配列のままにしてください。',
    '- ノート本文に複数の本が混在している場合は、このノートの主題になっている1冊だけを対象にしてください。',
    '- 最後に JSON のみを返してください。',
    '',
    '# メタ情報',
    `- noteId: ${noteId}`,
    '',
    '# 現在入力されている書籍情報',
    `- officialTitle: ${currentBook?.officialTitle ?? ''}`,
    `- author: ${currentBook?.author ?? ''}`,
    `- publisher: ${currentBook?.publisher ?? ''}`,
    `- publishedYear: ${currentBook?.publishedYear ?? ''}`,
    `- readingStartedOn: ${currentBook?.readingStartedOn ?? ''}`,
    `- readingFinishedOn: ${currentBook?.readingFinishedOn ?? ''}`,
    `- isbn: ${currentBook?.isbn ?? ''}`,
    `- genre: ${currentBook?.genre ?? ''}`,
    `- themes: ${JSON.stringify(currentBook?.themes ?? [])}`,
    '',
    '# ノート情報',
    `- title: ${title || '(untitled)'}`,
    '',
    content || '(empty)',
    '',
    '# JSON schema',
    '```json',
    JSON.stringify(
      {
        schemaVersion: '1.0',
        type: 'bookProperties',
        noteId,
        book: {
          officialTitle: '',
          author: '',
          publisher: '',
          publishedYear: '',
          readingStartedOn: '',
          readingFinishedOn: '',
          isbn: '',
          genre: '',
          themes: [],
        },
      },
      null,
      2
    ),
    '```',
  ].join('\n');

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

export const parseImportedBookProperties = (value: string): ImportedBookProperties => {
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
  if (candidate.type !== 'bookProperties') {
    throw new Error('type は "bookProperties" である必要があります。');
  }
  if (typeof candidate.noteId !== 'string' || candidate.noteId.length === 0) {
    throw new Error('noteId が不正です。');
  }
  if (!candidate.book || typeof candidate.book !== 'object') {
    throw new Error('book が不正です。');
  }

  const book = candidate.book as Record<string, unknown>;

  return {
    schemaVersion: '1.0',
    type: 'bookProperties',
    noteId: candidate.noteId,
    book: normalizeBookProperties({
      officialTitle: typeof book.officialTitle === 'string' ? book.officialTitle : '',
      author: typeof book.author === 'string' ? book.author : '',
      publisher: typeof book.publisher === 'string' ? book.publisher : '',
      publishedYear: typeof book.publishedYear === 'string' ? book.publishedYear : '',
      readingStartedOn: typeof book.readingStartedOn === 'string' ? book.readingStartedOn : '',
      readingFinishedOn: typeof book.readingFinishedOn === 'string' ? book.readingFinishedOn : '',
      isbn: typeof book.isbn === 'string' ? book.isbn : '',
      genre: typeof book.genre === 'string' ? book.genre : '',
      themes: isStringArray(book.themes) ? book.themes : [],
    }),
  };
};
