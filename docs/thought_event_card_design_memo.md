# 思考イベントカード機能 設計メモ

## 1. 目的
本メモは、`reflect_journal_thought_event_requirements.md` と `codex_implementation_brief_thought_event_card.md` を実装に落とすための設計整理を目的とする。

要件上の主構造は以下とする。

- カテゴリ（任意の補助分類）
- きっかけ 1 件
- 時系列ステップ複数件

カテゴリは既存 `tag` を継続利用するが、思考イベントの主構造ではなくメタ情報として扱う。

---

## 2. データモデル方針

### 2-1. ドメインモデル案
```ts
export const journalCardTags = ['仕事', 'プライベート', '学習'] as const;
export type JournalCardTag = (typeof journalCardTags)[number];

export const triggerTypes = ['external', 'internal', 'physical'] as const;
export type TriggerType = (typeof triggerTypes)[number];

export const stepTypes = ['thought', 'emotion', 'action', 'body'] as const;
export type StepType = (typeof stepTypes)[number];

export type CardTrigger = {
  type: TriggerType;
  content: string;
};

export type CardStep = {
  id: string;
  order: number;
  type: StepType;
  content: string;
};

export type Card = {
  id: string;
  tag?: JournalCardTag;
  trigger: CardTrigger;
  steps: CardStep[];
  createdAt: string;
  updatedAt: string;
};
```

### 2-2. モデル方針
- `tag` は任意
- `trigger` は MVP では必須構造として保持する
- `steps` は空配列を許容するが、実UIでは少なくとも1件入力しやすい導線を作る
- `order` は表示順と同義にする
- `steps[].id` は React の key と編集安定性のため保持する

### 2-3. ラベル変換
内部値と表示値は分離する。

- TriggerType
  - `external` -> `外部出来事`
  - `internal` -> `内部発生`
  - `physical` -> `身体状態`
- StepType
  - `thought` -> `思考`
  - `emotion` -> `感情`
  - `action` -> `行動`
  - `body` -> `身体反応`

変換ロジックは UI 内に散らさず共通化する。

---

## 3. 既存データ互換方針

### 3-1. 基本方針
新旧のカード shape は大きく異なるため、読み込み時マイグレーションを基本案とする。

理由:

- 既存利用データを壊しにくい
- 保存形式を早期に新構造へ統一できる
- UI 側の分岐を増やしすぎずに済む

### 3-2. 旧データから新データへの写像案
旧カード:

- `fact`
- `thought`
- `emotion`
- `bodySensation`
- `tag`

新カードへの変換:

- `tag` -> `tag`
- `fact` -> `trigger.content`
- `trigger.type` -> 暫定で `external`
- `thought` があれば `steps` に `thought`
- `emotion` があれば `steps` に `emotion`
- `bodySensation` があれば `steps` に `body`

補足:

- 旧データには `action` が存在しないため生成しない
- `fact` は厳密には「きっかけ」と一致しない可能性があるが、既存資産維持を優先して trigger に寄せる
- 変換ルールは PR 説明にも明記する

### 3-3. 互換対象
- localStorage snapshot
- DynamoDB 上の既存 `cards` 配列
- API 返却データ

### 3-4. 非互換回避の実装案
- 読み込み時に旧 shape 判定関数を持つ
- 判定後に新 shape へ正規化する
- 保存時は常に新 shape を書く

---

## 4. 永続化方針

### 4-1. DynamoDB
現行の「DAY アイテムに `cards: Card[]` を持つ」方針は維持する。

変更点:

- `Card` の shape 更新
- `createCard` / `updateCard` の構築ロジック更新
- 読み出し時の旧 shape 正規化

この方針なら PK/SK や日単位の取得設計はそのまま流用できる。

### 4-2. localStorage
既存 snapshot 読み込み時に旧カードを正規化する。

追加で必要なこと:

- カード shape のバリデーション関数
- snapshot 全体の新旧判定
- write 時は新構造のみ

---

## 5. API/契約方針

### 5-1. リクエスト/レスポンス
`PostCardRequest` / `PutCardRequest` / `Card` / `CreateCardInput` を新構造に合わせる。

### 5-2. バリデーション観点
- `trigger.type` が許可値内であること
- `trigger.content` が string であること
- `steps` が配列であること
- 各 step の `type`, `content`, `order` が妥当であること
- `tag` が存在する場合は許可カテゴリ内であること

### 5-3. ルート設計
URL 構造は維持する。

- `POST /days/:date/cards`
- `PUT /days/:date/cards/:cardId`
- `DELETE /days/:date/cards/:cardId`

大きく変える必要はない。

---

## 6. UI設計方針

### 6-1. フォーム構成
入力順は以下を基本とする。

1. カテゴリ
2. きっかけ
3. ステップ一覧
4. ステップ追加
5. 保存

### 6-2. 画面内構造案
- `CategorySelect`
- `TriggerInputSection`
- `StepListEditor`
- `StepRowEditor`
- `StepTypeSelect`

### 6-3. スマホ
- 単一カラム
- 下部寄りに保存と完了操作
- ステップ追加ボタンは一覧末尾
- textarea 自動伸長を継続

### 6-4. PC
- 必要なら 2 カラム
- 左: カテゴリときっかけ
- 右: ステップ編集
- 一覧性優先で種別チップと本文を横方向に整理

### 6-5. 編集操作
- ステップ追加は末尾のみ
- ステップ削除可
- ステップ種別変更可
- 並び替えなし
- 途中挿入なし

---

## 7. カード表示方針

### 7-1. 表示順
- ヘッダ: カテゴリ、作成時刻、編集操作
- 本文上部: きっかけ
- 本文下部: ステップ一覧

### 7-2. 表示ルール
- きっかけはカード内で独立ブロック化する
- ステップは番号付きまたは視覚的連番で時系列を示す
- 種別は色付きチップまたはラベルで控えめに区別する

---

## 8. Markdown出力方針

### 8-1. 出力構造
```md
## 思考イベント
- 作成日時: 2026-03-22 10:30
- カテゴリ: 仕事

### きっかけ
- 種別: 外部出来事
- 内容: 会議で進め方に厳しい指摘を受けた

### ステップ
1.
- 種別: 思考
- 内容: 自分の進め方を否定された気がした

2.
- 種別: 感情
- 内容: イライラした

3.
- 種別: 身体反応
- 内容: 胸がざわついた
```

### 8-2. 実装方針
- Markdown 文字列生成は utility に分離する
- UI はその utility を呼ぶだけにする
- カテゴリ未設定時はカテゴリ行を省略する
- 内部コード値は必ず表示ラベルへ変換する
- ステップは簡潔さより構造明瞭性を優先し、`種別` と `内容` を別行で出力する

---

## 9. テスト方針

### 9-1. 単体テスト
- trigger type のラベル変換
- step type のラベル変換
- tag のラベル変換または許可値検証
- Markdown 生成
- 旧カードから新カードへの変換

### 9-2. リポジトリ/保存系
- createCard で新構造が保存される
- updateCard で trigger/steps/tag が更新される
- 旧構造データを読み込める

### 9-3. UI
- カテゴリ選択が表示される
- きっかけ入力が表示される
- ステップを追加できる
- ステップ種別を変更できる
- ステップ削除できる
- 編集時に既存内容が初期表示される

---

## 10. 実装順序案
1. 新ドメイン型とラベル変換 utility を定義する
2. 旧データ正規化ロジックを実装する
3. API 契約とリポジトリを更新する
4. Markdown utility を作る
5. フォーム UI を新構造へ置き換える
6. カード表示 UI を更新する
7. Day/Week/Month の Markdown 出力利用箇所を差し替える
8. テスト追加

---

## 11. 未決事項
- `trigger` を完全必須にするか、空文字許容で保存時にのみ制御するか
- step 0 件保存を許可するか
- 旧 `fact` を常に `external` に寄せる暫定変換で十分か
- カテゴリの内部値を日本語のまま維持するか、英字コードへ寄せるか

現時点では、既存影響を抑えるため `tag` は日本語値のまま維持する案が最も低コスト。
