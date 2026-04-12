# Thinking Reflection PoC

## Goal

新版フローとして、`きっかけ + 自由記述` の日次カードを保存し、ChatGPTへ固定プロンプト付きで出力したJSONをアプリへ取り込んで思考振り返り画面を表示する。

## Route Map

- `/`
  - 旧版 / 新版の入口ページ
- `/calendar`
  - 旧版カレンダー
- `/v2/calendar`
  - 新版カレンダー
- `/v2/day/:date`
  - 新版の日次ハブ
  - 記録追加
  - ChatGPT貼り付け用出力
  - JSON取り込み
  - 思考振り返り結果への導線
- `/v2/day/:date/thinking`
  - 思考振り返り結果表示
- `/v2/week/:weekStart/thinking`
  - 週次ふりかえりの出力、JSON取込、結果表示、自由記述メモ

## Data Model

```ts
type ThinkingMemoCard = {
  id: string;
  trigger: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type ThinkingReflectionCard = {
  card_id: string;
  trigger: string;
  thoughts: string[];
  emotions: string[];
  body_reactions: string[];
  actions: string[];
};

type ThinkingReflectionResult = {
  date: string;
  mode: "thinking";
  cards: ThinkingReflectionCard[];
  daily_patterns: string[];
  insight_candidates: string[];
  questions: string[];
  importedAt: string;
  rawJson: string;
};

type ThinkingQuestionResponse = {
  id: string;
  question: string;
  response: string;
  createdAt: string;
  updatedAt: string;
};

type WeeklyReflectionResult = {
  week_start: string;
  week_end: string;
  mode: "weekly_reflection";
  weekly_summary: string;
  repeated_patterns: Array<{ pattern: string; count: number }>;
  notable_changes: string[];
  question_answer_patterns: string[];
  unanswered_question_patterns: string[];
  growing_insights: string[];
  source_days: Array<{ date: string }>;
  importedAt: string;
  rawJson: string;
};

type WeeklyUserNote = {
  week_start: string;
  week_end: string;
  note: string;
  updated_at: string;
};

type ThinkingDayRecord = {
  date: string;
  memoCards: ThinkingMemoCard[];
  thinkingReflection: ThinkingReflectionResult | null;
  questionResponses: ThinkingQuestionResponse[];
  createdAt: string;
  updatedAt: string;
};

type ThinkingWeekRecord = {
  weekStart: string;
  weekEnd: string;
  reflection: WeeklyReflectionResult | null;
  userNote: WeeklyUserNote | null;
};
```

## API

- `GET /v2/days/:date`
- `GET /v2/months/:monthKey`
- `GET /v2/weeks/:weekStart`
- `POST /v2/days/:date/memo-cards`
- `DELETE /v2/days/:date/memo-cards/:memoCardId`
- `PUT /v2/days/:date/thinking-reflection`
- `PUT /v2/days/:date/question-responses`
- `PUT /v2/weeks/:weekStart/reflection`
- `PUT /v2/weeks/:weekStart/note`

## Prompt Contract

ChatGPTへ渡すテキストは以下の構成を持つ。

- 固定プロンプト本文
- `date: YYYY-MM-DD`
- 各カードの `card_id`, `trigger`, `body`

アプリ側は以下を検証してから保存する。

- `date` が対象日と一致する
- `mode === "thinking"`
- `cards.length` が出力元カード数と一致する
- `card_id` が既存カードに存在する
- `trigger` が出力元と一致する
- `questions` は最大3件

週次では、日次の整理結果から以下を材料として ChatGPT へ渡す。

- `date`
- `daily_summary`
- `insight_candidates`
- `questions`
- `answer_memos`

## Separation Policy

- 旧版の `Day` / `Card` モデルは変更しない
- 新版は `thinkingReflection` 系の別モデルで保持する
- APIも `/v2/...` に分離する
- UIも `V2*` ページ、`thinking/*` コンポーネントで分離する
- 問いへの追記は通常メモカードと分離し、ChatGPT用出力には含めない
- 週次もアプリ内AIではなく、日次整理結果を材料にした手動の ChatGPT 連携で扱う
- 週次入力には元メモ本文を使わず、日次の整理結果と問い回答だけを使う
