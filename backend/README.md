# Backend

Lambda 向けの TypeScript backend です。`API Gateway HTTP API -> Lambda -> DynamoDB` を前提にしています。

## Entry Points

- `backend/src/functions/api/handler.ts`
  - 本番用の Lambda handler
- `backend/src/server.ts`
  - ローカル確認用の HTTP adapter

## Routes

現在の主要 API は `TODO` と `新版ジャーナリング（/v2/*）` です。

### Common

- `GET /health`

### TODO

- `GET /todos?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `POST /todos`
- `PUT /todos/:taskId`
- `DELETE /todos/:taskId`
- `POST /todos/reorder`
- `POST /todo-labels`
- `PUT /todo-labels/:labelId`
- `DELETE /todo-labels/:labelId`

### 新版ジャーナリング（v2）

- `GET /v2/days/:date`
- `GET /v2/months/:monthKey`
- `GET /v2/weeks/:weekStart`
- `POST /v2/days/:date/memo-cards`
- `PUT /v2/days/:date/memo-cards/:memoCardId`
- `DELETE /v2/days/:date/memo-cards/:memoCardId`
- `PUT /v2/days/:date/thinking-reflection`
- `PUT /v2/days/:date/question-responses`
- `PUT /v2/weeks/:weekStart/reflection`
- `PUT /v2/weeks/:weekStart/note`

旧版ジャーナリング API（`/days`, `/weeks`, `/months`, `/years`, `/migration/local-storage-import`）は削除済みです。

## Environment Variables

- `BACKEND_REPOSITORY_DRIVER` (`memory` or `dynamodb`)
- `PORT`（ローカル実行時, 既定: `4000`）
- `JOURNAL_TABLE_NAME`（`dynamodb` 利用時に必須）
- `DYNAMODB_ENDPOINT`（DynamoDB Local 利用時）
- `AWS_REGION` / `AWS_DEFAULT_REGION`（既定: `ap-northeast-1`）
- `CORS_ALLOW_ORIGIN`（Lambda/API Gateway 運用時）

## Local Run

```bash
npm install
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev
```

ローカル server は `x-dev-user-id` ヘッダ未指定時、`local-dev-user` を JWT `sub` 相当として扱います。

`BACKEND_REPOSITORY_DRIVER` を省略した場合、ローカル server の既定は `memory`、Lambda handler 側の既定は `dynamodb` です。

追加開発時の標準フロー:

- まず `localhost` で route / service / repository の挙動を確認する
- frontend は `VITE_REPOSITORY_DRIVER=api`, `VITE_AUTH_MODE=local`, `VITE_API_BASE_URL=http://localhost:4000` で接続確認する
- その後に AWS 実環境向けの接続確認を行う

## Local DynamoDB

`dynamodb` driver をローカルで試す場合は `compose.yaml` の `dynamodb-local` を使います。

`dynamodb-local` は `-inMemory` で動かしているため、コンテナ再作成でデータは消えます。

起動:

```bash
npm run dynamodb:local:up
JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run dynamodb:local:init
BACKEND_REPOSITORY_DRIVER=dynamodb JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run backend:dev
```

停止:

```bash
npm run dynamodb:local:down
```
