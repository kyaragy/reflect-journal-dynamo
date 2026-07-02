import { createAiJournalServiceFromEnv } from '../src/repositories/factory';

const userId = process.env.DEV_USER_ID ?? 'local-dev-user';
const sampleSummaryTitle = 'サンプル 1on1まとめ（v1.1）';

const { aiJournalService, driver } = createAiJournalServiceFromEnv('dynamodb');

const existing = await aiJournalService.getSnapshot(userId);
if (existing.notes.some((note) => note.type === 'OneOnOneSummary' && note.title === sampleSummaryTitle)) {
  console.log(`Sample 1on1 summary already exists for ${userId} (driver: ${driver})`);
  process.exit(0);
}

const journalNote = await aiJournalService.createNote(userId, { type: 'Journal' });
await aiJournalService.updateNote(userId, journalNote.id, {
  type: 'Journal',
  title: '2026-07-02 迷っていること',
  content: [
    'AIジャーナルの一覧や1on1導線を整えてきたが、入口の整理と詳細画面の見せ方の優先順位で迷っている。',
    '画面を綺麗にするだけでなく、毎日使う流れが自然かどうかを重視したい。',
    '一方で、実装を先に進めたい気持ちもあり、どこまで要件を詰めるべきか悩んでいる。',
  ].join('\n\n'),
});

const workNote = await aiJournalService.createNote(userId, { type: 'Work' });
await aiJournalService.updateNote(userId, workNote.id, {
  type: 'Work',
  title: '実装優先順位の整理',
  content: [
    'UI改善とデータ構造拡張を同時に進めると判断負荷が高い。',
    'まずは読み返し価値の高い1on1サマリから手を入れる方が、成果が見えやすい気がしている。',
    'ただ、トップ導線も放置したくないので、進め方の切り分けが必要そう。',
  ].join('\n\n'),
});

const previousRun = await aiJournalService.createOneOnOneRun(userId, {
  targetNoteIds: [journalNote.id],
  contextSummaryIds: [],
  promptText: 'sample previous 1on1 prompt',
});
await aiJournalService.attachRunToNotes(userId, [journalNote.id], previousRun.id);

const previousSummary = await aiJournalService.importOneOnOneSummary(userId, {
  schemaVersion: '1.1',
  type: '1on1Summary',
  runId: previousRun.id,
  targetNoteIds: [journalNote.id],
  contextSummaryIds: [],
  summary: {
    title: '前回サンプル 1on1まとめ',
    markdown: [
      '## 今回話したテーマ',
      '入口の整理と、1on1で何を扱いたいのかの明確化について話した。',
      '',
      '## 気づき',
      '見た目よりも「どこから始めるか」の導線が重要だと整理できた。',
    ].join('\n'),
  },
  discussedThemes: ['入口導線', '1on1で扱う論点の明確化'],
  notableQuotes: ['まずはどこから始めるかを迷わせたくない'],
  insights: ['トップからの導線が体験全体を左右する'],
  nextActions: ['トップ導線を整理する'],
  changesSincePrevious: [],
  continuingThemes: ['導線の分かりやすさ'],
  newThemes: ['1on1準備画面の役割整理'],
  nextQuestions: ['1on1準備画面では何を最優先で見せるか'],
});
await aiJournalService.markOneOnOneRunSummarized(userId, previousRun.id, previousSummary.id);

const currentRun = await aiJournalService.createOneOnOneRun(userId, {
  targetNoteIds: [journalNote.id, workNote.id],
  contextSummaryIds: [previousSummary.id],
  promptText: 'sample current 1on1 prompt',
});
await aiJournalService.attachRunToNotes(userId, [journalNote.id, workNote.id], currentRun.id);

const currentSummary = await aiJournalService.importOneOnOneSummary(userId, {
  schemaVersion: '1.1',
  type: '1on1Summary',
  runId: currentRun.id,
  targetNoteIds: [journalNote.id, workNote.id],
  contextSummaryIds: [previousSummary.id],
  summary: {
    title: sampleSummaryTitle,
    markdown: [
      '## 今回話したテーマ',
      'UIの整え方そのものではなく、どの順序で改善していくかが今回の中心テーマだった。',
      '',
      '## 印象に残った発言',
      '「綺麗にすることより、毎日迷わず使えることを優先したい」という言葉が印象に残った。',
      '',
      '## 気づき',
      'トップ導線と1on1サマリの読み返し体験は、別の論点ではなく同じ体験設計の話としてつながっていた。',
      '',
      '## 次回確認したいこと',
      '一覧・詳細・トップのどこを先に整えると、最も日々の運用に効くかを次回も確認したい。',
    ].join('\n'),
  },
  discussedThemes: ['改善の優先順位', 'トップ導線', '1on1サマリの読み返し価値'],
  notableQuotes: [
    '綺麗にすることより、毎日迷わず使えることを優先したい',
    '一気に直すより、価値が見えるところから整えたい',
  ],
  insights: [
    'UI改善と機能追加を分けて考えるより、日々の利用導線としてまとめて捉えた方が判断しやすい',
    '1on1サマリは記録ではなく、次回へつなぐための読み返し資産として設計したい',
  ],
  nextActions: [
    '1on1サマリ詳細の見せ方を先に整える',
    'トップ画面の導線は次に最小差分で整理する',
  ],
  changesSincePrevious: [
    '前回は入口導線の話が中心だったが、今回は改善順序の判断基準まで言語化できた',
  ],
  continuingThemes: ['導線の分かりやすさ', '1on1で扱う価値の整理'],
  newThemes: ['読み返し資産としての1on1サマリ', '改善順序の判断基準'],
  nextQuestions: [
    '最初に直すべき画面はどこか',
    '読み返し価値を高めるために何を必須表示にするか',
  ],
});
await aiJournalService.markOneOnOneRunSummarized(userId, currentRun.id, currentSummary.id);

console.log(`Seeded sample 1on1 summary v1.1 for ${userId} (${driver})`);
