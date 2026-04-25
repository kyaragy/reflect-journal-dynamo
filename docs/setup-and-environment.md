# セットアップ・環境構築

このドキュメントは、2026-04-25 時点の現行構成に合わせたセットアップ手順です。

## 前提

- Node.js 20 以上推奨
- npm
- （任意）Docker: DynamoDB Local 利用時

## 1. 依存関係をインストール

```bash
npm install
```

## 2. frontend 用環境変数を作成

```bash
cp .env.local.example .env.local
```

`.env.local.example` の既定値:

```env
VITE_REPOSITORY_DRIVER=api
VITE_AUTH_MODE=local
VITE_API_BASE_URL=http://localhost:4000
```

## 3. ローカル最小構成（推奨）

backend を `memory` で起動し、Cognito なしで確認します。

```bash
# terminal 1
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev

# terminal 2
npm run dev
```

起動 URL:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

## 4. DynamoDB Local で確認する場合

```bash
# terminal 1
npm run dynamodb:local:up
JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run dynamodb:local:init

# terminal 2
BACKEND_REPOSITORY_DRIVER=dynamodb JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run backend:dev

# terminal 3
npm run dev
```

補足:

- `compose.yaml` の DynamoDB Local は `-inMemory` で起動
- コンテナ再作成でデータは消える
- `DYNAMODB_ENDPOINT` を指定した場合、backend はダミー認証情報で接続

## 5. Cognito ありで動かす場合（API モード）

frontend:

- `VITE_REPOSITORY_DRIVER=api`
- `VITE_AUTH_MODE=cognito`
- `VITE_API_BASE_URL=<API Gateway or backend URL>`
- `VITE_COGNITO_DOMAIN=<Hosted UI domain>`
- `VITE_COGNITO_APP_CLIENT_ID=<App Client ID>`

backend:

- 本番相当では `BACKEND_REPOSITORY_DRIVER=dynamodb`
- `JOURNAL_TABLE_NAME` 必須
- `AWS_REGION` 未指定時は `ap-northeast-1`

## 6. よく使うコマンド

- `npm run dev`
- `npm run backend:dev`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run backend:build`
