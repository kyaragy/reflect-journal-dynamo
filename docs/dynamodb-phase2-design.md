# DynamoDB Phase 2 Design

## このドキュメントの位置づけ

このドキュメントは `docs/dynamo-migration-project-plan.md` の `Phase 2. DynamoDB 設計` を具体化したものです。

前提:

- 既存の `reflect-journal` を直接置き換えない
- Amplify を含む AWS リソースは `reflect-journal-dynamo` 用に新規作成する
- 既存の `reflect-journal` の稼働環境には影響を与えない

この前提と `Phase 2` の内容に齟齬はありません。
`Phase 2` はアクセスパターン起点で新しい DynamoDB 設計を行うフェーズであり、既存 Aurora 環境の in-place 変更を前提にしていないためです。

## 1. 設計方針

今回の DynamoDB 設計では、まず次を優先します。

- 現行の API 契約をなるべく維持する
- backend service 層の振る舞いを大きく変えない
- 既存 Aurora の正規化テーブルをそのまま再現しない
- 低トラフィック前提の個人アプリとして、実装と運用の単純さを優先する

特に現行 API には `saveDay` があり、`Day` が `cards` 配列を内包しています。
このため、日単位の item に card 配列をまとめて保持する設計が現時点では最も自然です。

## 2. 現行ユースケースの整理

現在の domain / API / service から見える主要ユースケースは次の通りです。

### 2-1. 読み取り

- 初回表示時の当月データ取得
- `GET /days/:date`
- `GET /weeks/:weekKey`
- `GET /months/:monthKey`
- `GET /years/:yearKey`

### 2-2. 書き込み

- `PUT /days/:date`
- `PUT /days/:date/summary`
- `POST /days/:date/cards`
- `PUT /days/:date/cards/:cardId`
- `DELETE /days/:date/cards/:cardId`
- `PUT /weeks/:weekKey/summary`
- `PUT /months/:monthKey/summary`
- `PUT /years/:yearKey/summary`
- `POST /migration/local-storage-import`

## 3. API 取得方針の見直し

現時点では、`GET /bootstrap` で全 `day / weekly / monthly / yearly` を返す方針は採らないほうがよいと判断します。

理由:

- 初回表示は月カレンダーであり、全履歴の一括取得は過剰
- 利用期間が長くなるほど初回ロード量が増え続ける
- DynamoDB では画面単位、期間単位で必要分だけ取得するほうが自然

### 3-1. 推奨する読み取り単位

- Calendar 初回表示: `GET /months/:monthKey`
- 月移動時: 移動先の `GET /months/:monthKey`
- Day 画面: `GET /days/:date`
- Week 画面: `GET /weeks/:weekKey`
- Year 画面: `GET /years/:yearKey`

### 3-2. `GET /months/:monthKey` を初回 API に使う理由

既存の `GET /months/:monthKey` は、次を返せる形に整理すれば初回表示に十分です。

- その月の `days`
- その月に含まれる `weeklySummaries`
- その月の `monthlySummary`

カレンダー表示はこの単位で成立します。

### 3-3. `GET /bootstrap` の扱い

第一候補:

- `GET /bootstrap` は廃止する

代替候補:

- 互換性のために残すが、ローカル移行や一括 import 用途に限定する

今回の DynamoDB 設計では、日常利用の初回表示 API としては使わない方針を推奨します。

## 4. 推奨データモデル

現時点の第一候補は、`1 user = 1 partition` の単一テーブル設計です。

### 3-1. テーブル

候補:

- table name: `reflect-journal-dynamo-<env>-main`

主キー:

- `PK` string
- `SK` string

基本ルール:

- `PK = USER#<userId>`
- `SK` は item 種別ごとに分ける

### 3-2. item 種別

#### Day item

```text
PK = USER#<userId>
SK = DAY#<YYYY-MM-DD>
```

属性例:

- `entityType = DAY`
- `date`
- `dailySummary`
- `cards`
- `createdAt`
- `updatedAt`

`cards` は配列で保持します。各 card 要素は次の shape を持ちます。

- `id`
- `fact`
- `thought`
- `emotion`
- `bodySensation`
- `createdAt`
- `updatedAt`

この設計を採る理由:

- 現行の `Day` domain と一致する
- `saveDay` と相性がよい
- card の並び順を配列順で自然に保持できる
- day 取得時に別 item への query を増やさなくてよい

#### Weekly summary item

```text
PK = USER#<userId>
SK = WEEK#<YYYY-MM-DD>
```

属性例:

- `entityType = WEEKLY_SUMMARY`
- `weekKey`
- `summary`
- `createdAt`
- `updatedAt`

#### Monthly summary item

```text
PK = USER#<userId>
SK = MONTH#<YYYY-MM>
```

属性例:

- `entityType = MONTHLY_SUMMARY`
- `monthKey`
- `summary`
- `createdAt`
- `updatedAt`

#### Yearly summary item

```text
PK = USER#<userId>
SK = YEAR#<YYYY>
```

属性例:

- `entityType = YEARLY_SUMMARY`
- `yearKey`
- `summary`
- `createdAt`
- `updatedAt`

## 5. アクセスパターンと実装イメージ

### 5-1. month 取得

要件:

- 初回表示や月移動時に必要な情報だけ返す

実装案:

- `PK = USER#<userId>` で `Query`
- `SK BETWEEN DAY#<month-start> AND DAY#<month-end>` 相当の日次 item を取得する
- 同じ user partition から対象月に関係する `WEEK#<...>` と `MONTH#<...>` を取得する
- repository で `MonthRecord` に組み立てる

補足:

- 月単位取得に寄せることで、初回表示のデータ量を抑えられる
- 実装上は複数回 `Query/GetItem` してもよい

### 5-2. day 取得

実装案:

- `GetItem`
  - `PK = USER#<userId>`
  - `SK = DAY#<date>`

### 5-3. day 全体保存

実装案:

- `PutItem`
- item 全体を `Day` として保存

### 5-4. daily summary 更新

実装案:

- 対象 day item を `GetItem`
- 無ければ空 day を生成
- `dailySummary` を更新して `PutItem`

### 5-5. card 作成、更新、削除

実装案:

- 対象 day item を取得
- `cards` 配列をメモリ上で更新
- day item 全体を `PutItem`

この方式を先に採る理由:

- 現行 API と service に合わせやすい
- sort order 専用 item や GSI を最初から持ち込まずに済む
- 1 日の card 数は多くない前提なので、item サイズ制約に当たりにくい

留意点:

- 同一 day への同時更新が増えると競合制御が必要
- 必要なら将来 `version` 属性か `updatedAt` 条件付き更新を追加する

### 5-6. week 取得

実装案:

- weekly summary item は `GetItem`
- 対象週の日次 item を `Query` で取得する

### 5-7. year 取得

実装案:

- yearly summary item は `GetItem`
- 対象年の monthly summary item を `Query` で取得する

補足:

- 週次、月次、年次集計を高速化したくなった時点で GSI や派生 item を検討する
- 初期段階では実装の単純さを優先する

### 5-8. localStorage import

実装案:

- snapshot 内の day / weekly / monthly / yearly を item 単位で一括書き込みする
- `BatchWriteItem` か chunking 付きの順次書き込みを使う

## 6. GSI の扱い

現時点では `GSI なし` を第一候補にします。

理由:

- 主要アクセスはすべて `userId` 起点で閉じている
- month / week / year / day の各取得は `PK = USER#<userId>` で成立する
- まずはシンプルに始め、必要になってから追加したほうが安全

将来的に見直す条件:

- 特定月の day だけを大量データから効率良く取りたい
- card 単体の検索や並び替えが増える
- analytics や全文検索を別要件として持ち込みたくなる

## 7. トランザクションと整合性

現時点の判断:

- Day item 内に card を内包するため、多くの更新は 1 item 更新で完結する
- 初期段階では DynamoDB Transaction を必須にしない

必要に応じた拡張:

- 条件付き更新
- `version` ベースの楽観ロック
- import 時のみ部分的に `TransactWriteItems`

## 8. この設計のメリットと注意点

### メリット

- 現行の `Day` 型と整合しやすい
- repository 置換の範囲を比較的狭くできる
- GSI や複雑な item 分割を避けられる
- 新規 AWS 環境で独立して立ち上げやすい
- 初回表示を月単位に限定できる

### 注意点

- 1 day item が肥大化しすぎると再設計が必要
- card 単体更新で day item 全体を書き戻す実装になる
- month / week / year 取得で repository 側の組み立て処理は少し増える

ただし、現時点のアプリ特性と運用規模を考えると、このトレードオフは許容範囲です。

## 9. ローカルテスト前提の実装方針

今回の API 見直しは、まずローカルで確認できる状態を作ってから進めます。

### 9-1. 現状の問題

- frontend の `api` モードは Cognito 前提になっている
- backend の旧本番 repository は `RDS Data API` 前提になっていた
- そのため、API 改修の挙動をローカルだけで確認しにくい

### 9-2. 今回追加すべき方針

- backend にローカル開発用 repository driver を導入する
- `backend:dev` は AWS 非依存で起動できるようにする
- frontend の `api` モードでも、ローカル開発時は Cognito を必須にしない
- API 契約の変更確認は、まず `localhost` 上の frontend + backend で行う

### 9-3. 実装の第一候補

- backend:
  - `BACKEND_REPOSITORY_DRIVER=memory | dynamodb`
  - ローカル既定値は `memory`
- frontend:
  - `VITE_REPOSITORY_DRIVER=api` でも、開発時は `VITE_AUTH_MODE=local` などで認証をバイパス可能にする
  - `x-dev-user-id` を使ったローカルユーザー注入を維持する

これにより、月単位取得 API の改修や store の変更を AWS 接続前に検証できます。

`dynamodb` driver 自体の確認が必要になったら、DynamoDB Local を使って `DYNAMODB_ENDPOINT=http://localhost:8000` で接続する。

### 9-4. ローカル確認の標準手順

追加開発時は、次を標準手順とします。

```bash
# terminal 1
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev

# terminal 2
VITE_REPOSITORY_DRIVER=api VITE_AUTH_MODE=local VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

このときの確認先:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

この手順で、AWS 実接続前に API 改修や画面変更の事前確認を行う。

## 10. Phase 2 の結論

Phase 2 の現時点の結論は次の通りです。

- DynamoDB は単一テーブル設計を第一候補とする
- `PK = USER#<userId>` に user 単位のデータを集約する
- day は 1 item に `cards` 配列を内包する
- week/month/year は summary item として分離する
- 初期段階では GSI なしで始める
- 初回表示は `GET /months/:monthKey` を中心とし、全件 `bootstrap` は採らない
- 既存 `reflect-journal` は変更せず、`reflect-journal-dynamo` 用の新 AWS リソースで検証と稼働を行う
- API 改修はまずローカル backend で検証可能な状態を整えてから進める

## 11. 次にやること

Phase 3 に進む前に、次を詰めます。

1. DynamoDB item attribute の詳細 shape を決める
2. frontend の初回ロードを `GET /months/:monthKey` 前提に再設計する
3. ローカル backend 用 repository driver と認証バイパス方針を決める
4. repository の read/write メソッドと item 変換方針を決める
5. 新 AWS 構成で必要な環境変数と IAM 権限を洗い出す
