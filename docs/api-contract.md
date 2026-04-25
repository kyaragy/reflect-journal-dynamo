# API Contract

このドキュメントは、現行 backend API の契約メモです。  
運用対象は `TODO` と `新版ジャーナリング（/v2/*）` で、旧版ジャーナリング API は削除済みです。

## Response 形式

正常系:

```json
{
  "data": {},
  "meta": {
    "requestId": "..."
  }
}
```

異常系:

```json
{
  "error": {
    "code": "INVALID_DATE",
    "message": "Invalid date: expected YYYY-MM-DD",
    "details": {
      "date": "2026-13-40"
    }
  }
}
```

## Validation

- `date`: `YYYY-MM-DD`
- `weekKey`: `YYYY-MM-DD`（週開始日）
- `monthKey`: `YYYY-MM`
- `yearKey`: `YYYY`
- `cardId` / `taskId` / `labelId`: 空文字不可

## 認証

- frontend から `userId` は送信しない
- 本番では API Gateway JWT authorizer の `sub` を backend 側 userId として使用
- ローカル開発時は `x-dev-user-id` ヘッダ未指定なら `local-dev-user` を採用

## 現行 API

### Health

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

## 旧版ジャーナリング API

`/days`, `/weeks`, `/months`, `/years`, `/migration/local-storage-import` は削除済みです。
