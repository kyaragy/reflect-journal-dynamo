# AWS Dynamo Phase 3 Architecture

## このドキュメントの位置づけ

このドキュメントは `docs/dynamo-migration-project-plan.md` の `Phase 3. AWS アーキテクチャ改修方針の確定` を具体化したものです。

前提:

- 既存 `reflect-journal` の AWS 環境は変更しない
- `reflect-journal-dynamo` 用の AWS リソースを新規作成する
- frontend / auth / API / compute の役割は維持しつつ、DB を `DynamoDB` に置き換える

補足:

- 旧 Aurora 構成の詳細手順は `docs/old/aws-manual-setup.md`
- 旧 Aurora 構成の計画資料は `docs/old/aws-migration-plan.md`
- DynamoDB 版の新資料は `docs/aws-dynamo-manual-setup.md` と `docs/aws-dynamo-migration-plan.md` に集約する

## 1. 新 AWS 構成

今回の第一候補は次の構成です。

```text
Browser
  -> Amplify Hosting
  -> API Gateway HTTP API
  -> Lambda
  -> DynamoDB

Auth:
  Cognito User Pool + Hosted UI
```

維持する役割:

- frontend hosting: Amplify
- authentication: Cognito
- API entrypoint: API Gateway HTTP API
- compute: Lambda

置き換える役割:

- DB: Aurora PostgreSQL -> DynamoDB
- DB access method: RDS Data API -> DynamoDB SDK
- DB secret management: Secrets Manager の DB 接続情報 -> 原則不要

## 2. 新規作成する AWS リソース

最低限必要なリソースは次の通りです。

### 2-1. frontend / auth / API

- Amplify App
- Amplify Branch
- Cognito User Pool
- Cognito User Pool App Client
- Cognito Hosted UI domain
- API Gateway HTTP API
- API Gateway JWT Authorizer
- API Gateway Routes
- Lambda Function
- Lambda Execution Role
- Lambda Permission for API Gateway

### 2-2. data

- DynamoDB Table

必要に応じて追加:

- CloudWatch Log Group
- IAM managed policy または inline policy

今回は `Aurora Cluster`, `RDS Data API`, `Secrets Manager` の DB 接続情報は不要です。

## 3. 命名方針

既存 `reflect-journal` と混ざらないよう、名前は明確に分離します。

推奨:

- project: `reflect-journal-dynamo`
- env: `prod`
- region: `ap-northeast-1`

リソース名の例:

- Amplify App: `reflect-journal-dynamo`
- Cognito User Pool: `reflect-journal-dynamo-prod-user-pool`
- Cognito App Client: `reflect-journal-dynamo-prod-web-client`
- Lambda: `reflect-journal-dynamo-prod-api`
- API Gateway: `reflect-journal-dynamo-prod-http-api`
- DynamoDB Table: `reflect-journal-dynamo-prod-main`

重要:

- 既存 `reflect-journal-*` の名前を再利用しない
- Cognito callback URL や CORS origin も既存環境と分ける

## 4. DynamoDB テーブル方針

Phase 2 の結論に従い、単一テーブル設計を前提にします。

### 4-1. テーブル

- table name: `reflect-journal-dynamo-prod-main`
- partition key: `PK` string
- sort key: `SK` string

第一候補:

- billing mode: `PAY_PER_REQUEST`

理由:

- 個人開発、低トラフィック前提で扱いやすい
- 初期段階では capacity planning を簡略化できる

### 4-2. 現時点での GSI 方針

- 初期段階では GSI なし

必要になったら追加検討:

- card 検索
- 期間横断分析
- 月次や年次の取得最適化

## 5. Lambda の環境変数

Aurora 前提の環境変数は整理し、DynamoDB 前提へ更新します。

### 5-1. 必要な環境変数案

- `APP_ENV`
- `AWS_REGION`
- `JOURNAL_TABLE_NAME`
- `CORS_ALLOW_ORIGIN`
- `BACKEND_REPOSITORY_DRIVER`

想定値の例:

```text
APP_ENV=prod
JOURNAL_TABLE_NAME=reflect-journal-dynamo-prod-main
CORS_ALLOW_ORIGIN=https://<AMPLIFY_APP_URL>
BACKEND_REPOSITORY_DRIVER=dynamodb
```

### 5-2. 不要になる環境変数

- `DATABASE_ARN`
- `DATABASE_SECRET_ARN`
- `DATABASE_NAME`

## 6. Lambda の IAM 権限

Aurora / Data API 向け権限は外し、DynamoDB テーブルに必要な最小権限へ置き換えます。

### 6-1. 最低限必要な権限

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:BatchWriteItem`

必要に応じて:

- `dynamodb:TransactWriteItems`
- `dynamodb:ConditionCheckItem`

### 6-2. 対象リソース

- `arn:aws:dynamodb:<region>:<account-id>:table/reflect-journal-dynamo-prod-main`

GSI を追加したら必要に応じて index ARN も対象に含めます。

### 6-3. 不要になる権限

- `rds-data:*`
- `secretsmanager:GetSecretValue` for DB credentials

## 7. API Gateway 方針

役割は現行とほぼ同じです。

- `GET /health` は認証なし
- それ以外は JWT authorizer 付き
- Lambda integration は 1 つで受ける

注意点:

- `GET /bootstrap` は通常利用から外す前提
- 初回表示は `GET /months/:monthKey`
- month / week / year / day の route を中心に構成する

## 8. Cognito 方針

役割は維持します。

- Cognito Hosted UI
- Authorization Code Flow + PKCE
- API Gateway 側で JWT authorizer を利用
- Lambda では `sub` を userId として扱う

新規環境で分離する対象:

- User Pool
- App Client
- callback URL
- sign-out URL
- Hosted UI domain

## 9. Amplify 方針

Amplify も既存環境と分離して新規作成します。

### 9-1. Amplify 環境変数案

- `VITE_REPOSITORY_DRIVER=api`
- `VITE_API_BASE_URL=<API Gateway URL>`
- `VITE_AUTH_MODE=cognito`
- `VITE_COGNITO_DOMAIN=<Cognito Hosted UI domain>`
- `VITE_COGNITO_APP_CLIENT_ID=<App Client ID>`

### 9-2. ローカルとの役割分離

- ローカル開発では `VITE_AUTH_MODE=local`
- Amplify では `VITE_AUTH_MODE=cognito`

## 10. 反映順

新環境は次の順で作るのが安全です。

1. Cognito User Pool
2. テストユーザー作成
3. DynamoDB Table
4. Lambda Function
5. Lambda IAM policy
6. API Gateway HTTP API
7. JWT Authorizer
8. Amplify App
9. Amplify 環境変数設定
10. Cognito callback / sign-out URL へ Amplify URL 追加

理由:

- Cognito がないと authorizer を確定できない
- DynamoDB がないと Lambda 環境変数を確定できない
- Lambda がないと API Gateway integration を作れない
- API URL がないと Amplify 環境変数を埋めにくい

## 11. AWS prod only 方針

- AWS 上に作成する `reflect-journal-dynamo` 環境は `prod` のみとする
- `dev` 用 AWS 環境は作成しない
- 開発時の事前確認は `localhost + memory` または `localhost + DynamoDB Local` で行う
- AWS 上での検証は、ローカル確認完了後に `prod` 環境へ反映して行う

## 12. 本番とローカルの責務分離

ローカルで確認するもの:

- API 契約変更
- store 更新
- frontend 表示
- backend route / service / repository の基本動作

AWS で確認するもの:

- Cognito 実認証
- API Gateway JWT authorizer
- Lambda 実行設定
- DynamoDB 実接続
- CORS / IAM / Amplify 本番設定

この切り分けにより、AWS に反映する前にローカルで十分に差分を潰せます。

## 12. Phase 3 の結論

Phase 3 の現時点の結論は次の通りです。

- 新環境は `Amplify + Cognito + API Gateway + Lambda + DynamoDB`
- 既存 `reflect-journal` の AWS リソースは触らない
- DynamoDB は単一テーブル、`PAY_PER_REQUEST` を第一候補にする
- Lambda は `JOURNAL_TABLE_NAME` を使って DynamoDB にアクセスする
- IAM は DynamoDB 最小権限へ置き換える
- Amplify と Cognito の設定も `reflect-journal-dynamo` 系として分離する

## 13. 次にやること

次タスクは Phase 4 の準備として、backend の DynamoDB repository 実装方針を具体化することです。

具体的には次を詰めます。

1. `DynamoDbJournalRepository` の read/write API
2. item <-> domain の mapper
3. AWS SDK v3 DynamoDB client の採用方針
4. `BACKEND_REPOSITORY_DRIVER=dynamodb` の実装
5. month / week / year 取得ロジック
