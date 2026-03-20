# Backend

Lambda 向けの TypeScript backend です。実装は `API Gateway HTTP API -> Lambda -> DynamoDB` を前提にしています。

## Entry Points

- `backend/src/functions/api/handler.ts`
  - 本番用の Lambda handler
- `backend/src/server.ts`
  - ローカル確認用の HTTP adapter

## Routes

- `GET /health`
- `GET /days/:date`
- `PUT /days/:date`
- `PUT /days/:date/summary`
- `POST /days/:date/cards`
- `PUT /days/:date/cards/:cardId`
- `DELETE /days/:date/cards/:cardId`
- `GET /weeks/:weekKey`
- `PUT /weeks/:weekKey/summary`
- `GET /months/:monthKey`
- `PUT /months/:monthKey/summary`
- `GET /years/:yearKey`
- `PUT /years/:yearKey/summary`
- `POST /migration/local-storage-import`

## Environment Variables

- `BACKEND_REPOSITORY_DRIVER`
- `AWS_REGION`
- `DYNAMODB_ENDPOINT`
- `JOURNAL_TABLE_NAME`
- `CORS_ALLOW_ORIGIN`
- `PORT`

## Local Run

```bash
npm install
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev
```

ローカル server は `x-dev-user-id` ヘッダを指定しない場合、`local-dev-user` を JWT `sub` 相当として扱います。

ローカルで AWS 非依存に起動したい場合:

```bash
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev
```

`BACKEND_REPOSITORY_DRIVER` を省略した場合、ローカル server では `memory` が既定値です。Lambda handler 側では `dynamodb` が既定値です。

追加開発時の標準フロー:

- まず `localhost` の backend で route / service / repository の挙動を確認する
- frontend からは `VITE_REPOSITORY_DRIVER=api`, `VITE_AUTH_MODE=local`, `VITE_API_BASE_URL=http://localhost:4000` で接続確認する
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
