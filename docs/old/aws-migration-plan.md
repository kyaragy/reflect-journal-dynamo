# AWS Migration Plan

Reflect Journal を AWS に移行する際の、低コスト寄りなサーバーレス RDB 構成メモです。

実際の AWS コンソール操作手順は `docs/old/aws-manual-setup.md` を参照してください。

2026-03-12 時点では、次の前提で考えるのが妥当です。

- Frontend: Amplify Hosting
- Auth: Amazon Cognito User Pool
- API: Amazon API Gateway HTTP API
- Compute: AWS Lambda
- DB: Amazon Aurora Serverless v2
- DB access secret: AWS Secrets Manager
- DB access method: Amazon RDS Data API

## この構成にする理由

- App Runner は常時稼働の API コンテナ運用には向いているが、今回のような低トラフィック前提では `Lambda` のほうが待機コストを抑えやすい
- DynamoDB よりも、将来の集計・結合・スキーマ管理を見据えて RDB のほうが拡張しやすい
- Aurora は `Aurora Serverless v2` を前提にする
- `Aurora Serverless v1` は 2025-03-31 に EOL になっているため、新規前提として採らない
- Lambda から Aurora へ通常の DB 接続を張る構成は、接続数管理の都合で `RDS Proxy` を検討しやすいが、`RDS Proxy` を関連付けると Aurora Serverless v2 の auto-pause が効かない
- コスト優先なら、まずは `RDS Data API` を使って connectionless に SQL を発行する構成が扱いやすい

## 推奨アーキテクチャ

```text
Browser
  -> Amplify Hosting
  -> API Gateway HTTP API
  -> Lambda
  -> RDS Data API
  -> Aurora Serverless v2 (PostgreSQL 推奨)
     + Secrets Manager
```

補足:

- Cognito でログインした access token をフロントから API に送る
- API Gateway の JWT authorizer で JWT を先に検証する
- Lambda では authorizer から渡された claim を使って `userId` を解決する
- Lambda を VPC に入れずに済むため、最初の構成としては運用しやすい

## 現状から見た変更対象

このリポジトリにはまだ AWS IaC がなく、主な変更対象はドキュメントと backend 実装方針です。

### 1. ドキュメントの前提変更

修正対象:

- `README.md`
- `backend/README.md`
- `docs/api-contract.md`
- `docs/old/aws-migration-plan.md`

修正内容:

- `App Runner` 前提の記述を `API Gateway + Lambda` 前提へ変更する
- `DynamoDB` 前提の保存設計を `Aurora PostgreSQL` 前提のテーブル設計へ変更する
- 認証責務を「Lambda で JWT 生検証」ではなく「API Gateway で JWT 検証、Lambda では claims 利用」に寄せる

### 2. backend 実装の変更

現状:

- `backend/src/server.ts` は Node.js の HTTP サーバーとして in-memory 実装を持っている
- App Runner 専用コードにはなっておらず、API 契約確認用のモノリシックなルーターである

変更方針:

- HTTP サーバー固有のルーティングと、業務ロジック・永続化を分離する
- Lambda handler から呼べる service 層を切り出す
- 永続化を in-memory `Map` から Aurora 向け repository に差し替える

具体的には次の分割が必要です。

- `backend/src/server.ts`
  - ローカル開発専用のエントリーポイントとして残す
  - ルーティングは handler/service を呼ぶ薄い層にする
- `backend/src/handlers/*`
  - API Gateway event を受ける Lambda handler を追加する
- `backend/src/services/*`
  - day/week/month の取得更新ロジックを分離する
- `backend/src/repositories/*`
  - Aurora 用の SQL 実装を追加する
- `backend/src/auth/*`
  - API Gateway authorizer claims から `userId` を読む薄い adapter を追加する

### 3. DB 設計の変更

`DynamoDB` 単一テーブル設計ではなく、RDB の正規化寄り設計に変更します。

最初の候補:

#### users

- `id` UUID or Cognito `sub`
- `created_at`
- `updated_at`

#### journal_days

- `user_id`
- `date`
- `daily_summary`
- `created_at`
- `updated_at`
- primary key: `(user_id, date)`

#### journal_cards

- `id`
- `user_id`
- `date`
- `sort_order`
- `fact`
- `thought`
- `emotion`
- `body_sensation`
- `created_at`
- `updated_at`
- unique index: `(user_id, date, sort_order)`
- foreign key: `(user_id, date)` -> `journal_days(user_id, date)`

#### weekly_summaries

- `user_id`
- `week_key`
- `summary`
- `created_at`
- `updated_at`
- primary key: `(user_id, week_key)`

#### monthly_summaries

- `user_id`
- `month_key`
- `summary`
- `created_at`
- `updated_at`
- primary key: `(user_id, month_key)`

補足:

- `year` 単位の閲覧が増えるなら、年次サマリー用テーブルは後から追加でよい
- `journal_cards` を JSONB で `journal_days` に埋め込む案もあるが、将来の検索や並び替え変更を考えると分離のほうが安全

### 4. 認証の変更

注意:

- この章は移行設計の経緯を残したものです
- 実際の現在構成と運用手順は `docs/old/aws-manual-setup.md` を正とします

現状:

- frontend は Cognito Hosted UI ベースの認証導線へ移行済み
- backend は API Gateway HTTP API の JWT authorizer を前提とし、Lambda では JWT claim の `sub` を利用する

変更方針:

- frontend の `AuthContext` / `authSession` を Cognito SDK ベースへ差し替える
- API Gateway HTTP API に JWT authorizer を設定する
- Lambda では event の JWT claim から `sub` を取得する

これにより、Lambda で毎回 JWKS 取得や JWT 署名検証を実装しなくてよくなります。

### 5. デプロイ構成の変更

App Runner を前提にした「コンテナとして backend を載せる」発想から、次へ変わります。

- frontend: Amplify Hosting
- backend: API Gateway HTTP API + Lambda
- database: Aurora Serverless v2
- secret: Secrets Manager

必要な IaC リソースの例:

- `AWS::Cognito::UserPool`
- `AWS::Cognito::UserPoolClient`
- `AWS::ApiGatewayV2::Api`
- `AWS::ApiGatewayV2::Authorizer`
- `AWS::ApiGatewayV2::Integration`
- `AWS::ApiGatewayV2::Route`
- `AWS::Lambda::Function`
- `AWS::Lambda::Permission`
- `AWS::RDS::DBCluster`
- `AWS::RDS::DBInstance` with `db.serverless`
- `AWS::SecretsManager::Secret`

IaC は CloudFormation 直書きより、CDK か Terraform のどちらかでまとめるほうが保守しやすいです。

## 実装時の重要な判断

### Aurora のエンジン

`Aurora PostgreSQL` を第一候補にします。

理由:

- JSONB を持てる
- 将来の検索・集計・部分更新がやりやすい
- 一般的な ORM / migration tool の選択肢が多い

### Lambda から DB への接続方式

第一候補:

- `RDS Data API`

理由:

- Lambda を VPC に入れなくてよい
- 接続プール問題を持ち込まない
- 低トラフィック時に Aurora の auto-pause を阻害しにくい

留意点:

- Data API は writer に対して実行される
- レスポンスサイズ制限がある
- 一般的な DB ドライバ直結よりも抽象化を 1 段入れたほうがよい

将来の代替:

- トラフィック増加後に `Lambda in VPC + RDS Proxy + PostgreSQL driver` へ移行する
- ただしこの構成は low-cost 最優先の初期フェーズでは優先しない

## このリポジトリで今後必要になる具体修正

### frontend

- `src/auth/AuthContext.tsx`
  - mock 実装から Cognito 連携へ差し替える
- `src/auth/authSession.ts`
  - Cognito access token の保持方法へ合わせる
- `src/lib/apiClient.ts`
  - API Gateway の base URL を使う

### backend

- `backend/src/server.ts`
  - in-memory 実装を service 呼び出しへ薄くする
- `backend/src/repositories/aurora*`
  - SQL 実装を追加する
- `backend/src/handlers/*`
  - Lambda handler を追加する
- `backend/src/db/*`
  - Data API client と SQL helper を追加する

### docs / ops

- migration 手順書を追加する
- ローカル開発用 `.env.example` を追加する
- DB migration ツールを追加する

## 推奨する移行順

1. backend の service / repository 分離
2. Aurora 前提のスキーマ設計と migration 追加
3. in-memory repository を Aurora repository に置き換え
4. Lambda handler 追加
5. API Gateway + Cognito authorizer の IaC 追加
6. frontend の Cognito 連携
7. Amplify Hosting と本番 API 接続

## 注意点

- `Aurora Serverless v2` は「完全無料」ではなく、ストレージやバックアップなどの固定寄りコストは残る
- 低コスト化の鍵は `auto-pause` を活かせる構成にすること
- `RDS Proxy`、常時接続、不要な監視設定、開発用 reader 追加は idle コストを押し上げやすい
- 本番前には SQL migration とバックアップ復元手順を最低限整備する
