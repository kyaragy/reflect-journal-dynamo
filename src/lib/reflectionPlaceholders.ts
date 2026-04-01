export const reflectionModes = ['day', 'week', 'month'] as const;
export type ReflectionMode = (typeof reflectionModes)[number];

export const reflectionPlaceholderMap: Record<ReflectionMode, string> = {
  day: `今日のサマリ：
（何があったか / 何が印象に残ったか）

気づいたこと：
（新しく得た見方 / ChatGPTとの対話で出た視点）

修正したい思考：
（決めつけ・極端だった考え）

明日意識すること：
（小さく変えること）

残った問い：
（まだ整理できていないこと）`,
  week: `今週のサマリ：
（全体の流れ）

繰り返していたパターン：
（思考・感情・行動の癖）

今週得た新しい観点：
（複数日から見えてきたこと）

改善したい癖：
（継続的に問題になりそうなもの）

来週意識すること：
（1〜2個に絞る）

継続して観察する問い：
（来週も見たいテーマ）`,
  month: `今月のサマリ：
（全体テーマ）

今月よく出た思考・感情：
（特徴的な傾向）

変わったこと：
（前月との違い）

変わらなかったこと：
（繰り返し）

定着させたい考え方：
（良い変化）

来月の観察テーマ：
（継続対象）

長期的な問い：
（答えが出ていない問い）`,
};

export const triggerPlaceholder = `きっかけになった出来事や、最初に起きたことを書いてください
例：会議で厳しい指摘を受けた
例：急に不安になった
例：胸がざわついた`;

export const getReflectionPlaceholder = (mode: ReflectionMode) => reflectionPlaceholderMap[mode];
