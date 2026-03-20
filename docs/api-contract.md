# Journal API Contract

将来 `API Gateway + Lambda` などの backend API で提供することを見据えた、フロント側の契約メモです。

## Path

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

## Initial Loading Policy

- 初回のカレンダー表示では `GET /months/:monthKey` を使う
- 月移動時も都度 `GET /months/:monthKey` を使う
- `GET /weeks/:weekKey` は週画面用
- `GET /years/:yearKey` は年画面用
- 全履歴一括取得の `GET /bootstrap` は通常利用の API としては採らない

`GET /months/:monthKey` は次を返す前提で扱う:

- その月の `days`
- その月に含まれる `weeklySummaries`
- その月の `monthlySummary`

`GET /years/:yearKey` は次を返す前提で扱う:

- その年の `yearlySummary`
- その年の `monthlySummaries`

## Success Response

正常系は `{ data, meta? }` を基本形とします。

## Error Response

異常系は以下を基本形とします。

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

## Validation Policy

- `date`: `YYYY-MM-DD`
- `weekKey`: `YYYY-MM-DD`
- `monthKey`: `YYYY-MM`
- `yearKey`: `YYYY`
- `cardId`: 空文字不可

`weekKey` は週の開始日を表す `YYYY-MM-DD` を前提とします。

## Auth

- frontend から `userId` は送らない
- API Gateway HTTP API の JWT authorizer が事前に JWT を検証する
- Lambda は `requestContext.authorizer.jwt.claims.sub` を `user_id` として扱う
