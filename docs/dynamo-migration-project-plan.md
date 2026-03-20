# Reflect Journal Dynamo Migration Plan

## このドキュメントの目的

このプロジェクトは、以前に私と Codex で開発した `reflect-journal` を改修するプロジェクトです。

以前の `reflect-journal` は、次の AWS 構成を前提に実装されていました。

- frontend: Amplify Hosting
- auth: Cognito User Pool + Hosted UI
- API: API Gateway HTTP API
- compute: Lambda
- DB: Aurora Serverless v2
- DB access: RDS Data API + Secrets Manager

今回は、DB を `RDS/Aurora PostgreSQL` から `DynamoDB` へ変更することをメインタスクとし、それに適合するように AWS アーキテクチャおよびソースコードを改修していくことを目的とします。

このドキュメントでは、まず現状構成を確認し、その後に改修を進めるためのプロセスを整理します。

## 1. 現状の構成確認

このリポジトリ内のドキュメントとソースコードを確認した時点で、現状は明確に `Aurora + Data API` 前提です。

### 1-1. ドキュメント上の現状

確認対象:

- `README.md`
- `backend/README.md`
- `docs/old/aws-manual-setup.md`
- `docs/old/aws-migration-plan.md`

現状の記載要点:

- frontend は `Amplify Hosting`
- 認証は `Cognito User Pool`
- API は `API Gateway HTTP API`
- backend は `Lambda`
- DB は `Aurora PostgreSQL Serverless v2`
- DB 接続は `RDS Data API + Secrets Manager`

特に `docs/old/aws-manual-setup.md` には、現行の手動構築手順と運用メモが詳細に残っており、現在の AWS 構成を把握する一次資料として使えます。

### 1-2. ソースコード上の現状

確認対象:

- `backend/src/db/dataApiClient.ts`
- `backend/src/repositories/journalRepository.ts`
- `backend/src/functions/api/handler.ts`
- `backend/src/server.ts`
- `backend/schema.sql`
- `src/repositories/api/apiRepository.ts`

確認結果:

- backend には `RDSDataClient` を使う `DataApiClient` 実装がある
- `DataApiJournalRepository` が Aurora/PostgreSQL 向け SQL を直接実行している
- Lambda handler は Data API ベースの repository を生成して service に渡している
- ローカル server も本番用 handler を呼ぶ構成で、backend の責務分離は一定程度できている
- `backend/schema.sql` には `users`, `journal_days`, `journal_cards`, `weekly_summaries`, `monthly_summaries`, `yearly_summaries` が定義されている
- frontend の API repository は HTTP API 契約に依存しており、DB 種別には直接依存していない

### 1-3. 現状認識の要約

つまり、現状は次のように整理できます。

- frontend と API 契約は比較的そのまま流用しやすい
- backend の service 層も大枠は流用しやすい
- ただし永続化層は `Aurora + SQL + Data API` に強く依存している
- AWS 運用ドキュメントも `Aurora` 前提で書かれているため、改修時にはドキュメント更新が必須

補足:

- 旧 AWS 手順書は `docs/old/` に退避し、履歴資料として保持する
- DynamoDB 版の AWS 手順書と移行計画は新規ファイルとして作成する

## 2. 今回の改修方針

今回の主目的は、永続化基盤を `Aurora PostgreSQL` から `DynamoDB` へ置き換えることです。

それに伴い、次の 3 つを一体で見直します。

1. AWS アーキテクチャ
2. backend のデータアクセス実装
3. 運用ドキュメント

### 2-1. 方針の前提

- frontend の UI/UX と API 契約は、可能な限り維持する
- 変更の主戦場は backend repository 層と AWS 構成に置く
- 一度に全面改修せず、現状理解と差分切り出しを先に行う
- ドキュメントを先に揃え、実装と運用の認識ずれを防ぐ
- 既存の `reflect-journal` を直接置き換える進め方は採らない
- Amplify を含む AWS リソースは新規に立て、`DynamoDB` 版アプリケーションを別系統で稼働させる
- 本改修の過程で、既存の `reflect-journal` の AWS リソースや稼働中アプリケーションに影響を与えないことを前提とする

### 2-2. 想定する改修の中心

- `RDS Data API` 利用コードを廃止または段階的に置き換える
- `DynamoDB` 向け repository 実装を追加する
- テーブル設計ではなく、DynamoDB のキー設計とアクセスパターンを定義する
- 初回表示時の全件 `bootstrap` を見直し、月単位など必要最小限の取得に寄せる
- `Aurora` 前提のセットアップ手順を `DynamoDB` 前提へ更新する
- 必要に応じて Lambda 環境変数、IAM 権限、運用手順を見直す
- 既存本番を更新するのではなく、`reflect-journal-dynamo` 用の新しいデプロイ先を整備する

### 2-3. 既存環境を保護するための原則

- 既存 `reflect-journal` の Amplify, Cognito, API Gateway, Lambda, Aurora には変更を加えない
- 新規リソースは `reflect-journal-dynamo` 系の名前で分離する
- 既存アプリの切り替えではなく、新規アプリとして疎結合に立ち上げる
- 必要なデータ移行が発生しても、既存 DB を直接更新する手順は後回しにし、まずは新環境単独で完結する構成を優先する

### 2-4. ローカルファースト開発の原則

- API 改修や repository 差し替えは、まずローカルで検証できる状態を作ってから進める
- `api` モードでも AWS 実環境に依存せずローカル確認できる backend 実行経路を用意する
- backend のローカル起動は、少なくとも `memory` か `local file` などの AWS 非依存 repository で成立させる
- frontend の `api` モード確認時も、Cognito 実接続を必須にせず、ローカル開発用の認証バイパスまたは開発用ユーザー注入を用意する
- AWS 接続確認はローカル検証完了後の段階で実施する
- 必要に応じて DynamoDB Local を使い、`dynamodb` driver 自体も AWS 反映前にローカルで確認する

ローカル検証の基準:

- frontend は `http://localhost:3000`
- backend は `http://localhost:4000`
- backend は `BACKEND_REPOSITORY_DRIVER=memory`
- frontend は `VITE_REPOSITORY_DRIVER=api` と `VITE_AUTH_MODE=local` で API 接続確認できる

この状態を整えたうえで、追加開発時は毎回まずローカルで事前テストと画面確認を行うことを標準フローとする

## 3. 改修を進めるためのプロセス

改修は次の順で進めます。

### Phase 1. 現状把握の固定化

目的:

- 既存構成を誤読せず、改修対象を明確にする

実施内容:

- 既存ドキュメントを現状資料として整理する
- backend の現 repository / service / route の責務を確認する
- 既存 API 契約が DB 変更の影響をどこまで受けるかを確認する
- 既存の保存単位を棚卸しする
  - day
  - card
  - weekly summary
  - monthly summary
  - yearly summary

成果物:

- この方針書
- 必要に応じた現状アーキテクチャ要約ドキュメント

### Phase 2. DynamoDB 設計

目的:

- RDB のテーブル設計を、そのまま DynamoDB に写経せず、アクセスパターン起点で再設計する
- 既存 `reflect-journal` とは独立した新規 DynamoDB テーブル設計を定義する
- API の取得粒度も見直し、初回表示で不要な全件読み込みを避ける

実施内容:

- 主要ユースケースを整理する
  - 初回表示時の当月データ取得
  - 日次データ取得
  - card の作成、更新、削除
  - 週次、月次、年次サマリー取得と更新
- どのアクセスを 1 テーブルで処理するか検討する
- PK / SK 設計を決める
- GSI が必要か判断する
- 更新整合性、並び順、トランザクション要否を決める
- localStorage import の保存方式も定義する
- 既存 Aurora との共存を前提に、新規 DynamoDB 環境だけで成立する保存方式を定義する
- `GET /bootstrap` の廃止または縮小を含めた API 契約見直しを行う

成果物:

- DynamoDB データモデル案
- エンティティ定義
- アクセスパターン一覧
- 画面単位の API 取得方針

### Phase 3. AWS アーキテクチャ改修方針の確定

目的:

- DynamoDB 化に合わせて AWS 構成と権限設計を整理する

実施内容:

- 既存構成のうち維持するものを確定する
  - Amplify の役割
  - Cognito の役割
  - API Gateway の役割
  - Lambda の役割
- 置き換えるものを確定する
  - Aurora PostgreSQL
  - RDS Data API
  - Secrets Manager の DB 接続情報
- ただし既存 AWS リソースを流用せず、`reflect-journal-dynamo` 用の新規リソースとして定義する
- Lambda に必要な IAM 権限を DynamoDB 前提で再定義する
- 運用手順書を DynamoDB ベースに更新する方針を決める

成果物:

- 新 AWS 構成図
- 必要な AWS リソース一覧
- 環境変数一覧の改訂案
- `docs/aws-dynamo-phase3-architecture.md`

### Phase 4. backend 実装の置換

目的:

- DB 依存を repository 層に閉じ込めたまま、永続化実装を DynamoDB に差し替える
- 同時に、AWS 実環境に依存しないローカル API 検証経路を整備する

実施内容:

- `DynamoDbJournalRepository` を新規実装する
- 必要なら repository interface を見直す
- service 層の振る舞いを保ったまま永続化実装を差し替える
- 既存の unit test を流用または拡張する
- backend の repository driver は `memory` と `dynamodb` の 2 系統に整理する
- `backend:dev` で `memory` などのローカル repository を起動できるようにする
- frontend の `api` モードをローカル backend に向けて検証できるよう、開発用認証導線を整理する
- Aurora / Data API 依存の実装は `backend/old/` に退避し、アクティブな改修対象から外す

成果物:

- DynamoDB repository 実装
- ローカル API テスト可能な backend 実行構成
- 必要なテスト追加
- 退避済みの旧 Aurora 依存コード

### Phase 5. ドキュメントと運用手順の更新

目的:

- 実装変更後に、次の開発や運用で迷わない状態を作る

実施内容:

- `README.md` を DynamoDB 前提に更新する
- `backend/README.md` を DynamoDB 前提に更新する
- `docs/aws-dynamo-manual-setup.md` を DynamoDB 構成の正式手順書として育てる
- `docs/aws-dynamo-migration-plan.md` を DynamoDB 版の計画書として育てる
- 旧 Aurora 前提の資料は `docs/old/` に退避して履歴として残す
- 新しい改修フローをドキュメント化する

成果物:

- 更新済みの README / backend README / AWS セットアップ資料

## 4. 実装着手前に確認すべきこと

実装を始める前に、少なくとも次の点を確定します。

- DynamoDB は単一テーブル設計でいくか
- `GET /bootstrap` を廃止するか、互換用途だけに縮小するか
- card の並び順をどう保持するか
- 集約更新を 1 item に寄せるか、複数 item に分けるか
- トランザクションを DynamoDB Transaction で扱う範囲をどうするか
- local 開発時に DynamoDB Local を使うか、まずは memory repository で進めるか
- ローカル API テスト時の認証バイパス方式をどうするか

## 5. 当面の作業順

次の順で進めるのが妥当です。

1. 現状の API / repository / データモデルを追加で棚卸しする
2. 月単位など必要単位で取得する API 方針を文章化する
3. ローカル API テストを可能にする実装方針を先に固める
4. DynamoDB のアクセスパターンとキー設計を文章化する
5. AWS アーキテクチャ差分を定義する
6. backend repository を DynamoDB 実装へ差し替える
7. テストを整備する
8. README と運用ドキュメントを更新する

## 6. このプロジェクトの進め方

このプロジェクトでは、毎回の改修で次を意識します。

- 先に現状確認
- 次に設計差分の明文化
- その後に小さく実装
- 最後にドキュメント更新

特に今回は、DB 種別の変更が AWS 構成、権限、backend 実装、運用手順に連鎖するため、コード変更だけを先行させないことを原則にします。
