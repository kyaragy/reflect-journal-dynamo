# Reflect Journal

振り返り用ジャーナルアプリです。ローカル開発に加えて、AWS 上の本番構成でも動作します。

## セットアップ

前提: Node.js

1. 依存関係をインストール
   `npm install`
2. 開発サーバーを起動
   `npm run dev`

## スクリプト

- `npm run dev`: 開発サーバー起動（`http://localhost:3000`）
- `npm run backend:dev`: backend API をローカル起動（`http://localhost:4000`）
- `npm run build`: 本番ビルド作成
- `npm run backend:build`: Lambda 用 backend bundle を作成
- `npm run preview`: ビルド結果をローカル確認
- `npm run lint`: TypeScript 型チェック

## データ永続化の構成

- UI コンポーネントは `useJournalStore` を通じてデータを扱います
- `useJournalStore` は repository 経由でデータを取得・保存します
- repository 実装は `src/repositories/` に集約されています
- デフォルトでは `localStorageRepository` が使われ、ブラウザの `localStorage` に保存します
- 将来 API / DB に移行する場合は repository 実装を差し替えることで、UI 側の変更を最小限に抑えられます

## Repository 切替

- デフォルトでは `localStorageRepository` を利用します
- `VITE_REPOSITORY_DRIVER=api` を指定すると `apiRepository` に切り替えられます
- API のベース URL は `VITE_API_BASE_URL` で設定できます
- `VITE_AUTH_MODE=local` を指定すると、`api` モードでも Cognito なしでローカル backend を使えます

## API Contract

- 将来の backend API に向けた client contract は `src/contracts/journalApi.ts` に定義しています
- 仕様メモは `docs/api-contract.md` を参照してください

## Auth

- `VITE_REPOSITORY_DRIVER=api` のときは Cognito Hosted UI を使った認証を前提に動作します
- frontend は authorization code flow + PKCE で token を取得し、API リクエストに `Authorization: Bearer ...` を付与します
- `VITE_REPOSITORY_DRIVER=local-storage` のときはローカル保存モードとして動作します
- `VITE_AUTH_MODE=local` のときは、`api` モードでも Cognito 認証を無効にしてローカル backend に接続できます

## Backend

- `backend/` に API Gateway HTTP API + Lambda + DynamoDB を前提にした backend 実装があります
- backend のローカル起動は `npm run backend:dev`
- 本番反映は `npm run backend:build` 後に Lambda へ zip を手動アップロードします
- エンドポイント一覧と backend 側の詳細は `backend/README.md` を参照してください

## ローカル起動

追加開発時は、AWS に接続せず `localhost` 上で事前確認してから本番向け作業に進めます。

起動構成:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`
- backend repository: `memory`
- auth mode: `local`

ローカル API 確認の例:

```bash
# terminal 1
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev

# terminal 2
VITE_REPOSITORY_DRIVER=api VITE_AUTH_MODE=local VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

確認できること:

- frontend から backend API を呼ぶ流れ
- route / service / repository の基本挙動
- API 契約変更の影響
- 月単位取得などの画面表示変更

確認対象外:

- Cognito 実認証
- API Gateway authorizer
- Lambda 実行環境差分
- DynamoDB 実接続
- AWS 側の CORS / IAM / リソース設定

運用方針:

- 追加開発時は、まず `localhost` で画面と API の挙動を確認する
- その後に AWS 向け実装や接続確認を行う
- 既存 `reflect-journal` の AWS 環境はこのローカル確認では変更しない

### Local DynamoDB で確認したい場合

`memory` ではなく `dynamodb` driver を使って確認する場合は、DynamoDB Local を起動します。

```bash
# terminal 1
npm run dynamodb:local:up
JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run dynamodb:local:init

# terminal 2
BACKEND_REPOSITORY_DRIVER=dynamodb JOURNAL_TABLE_NAME=reflect-journal-dynamo-local-main DYNAMODB_ENDPOINT=http://127.0.0.1:8000 npm run backend:dev

# terminal 3
VITE_REPOSITORY_DRIVER=api VITE_AUTH_MODE=local VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

補足:

- `compose.yaml` は `amazon/dynamodb-local` を `-inMemory` で起動します
- ローカル DynamoDB のデータはコンテナ再作成で消えます
- frontend 用の例は `.env.local.example` に置いています
- ローカル endpoint を指定すると backend はダミー認証情報で DynamoDB Local に接続します

## 現在の AWS 構成

- frontend: Amplify Hosting
- auth: Cognito User Pool
- API: API Gateway HTTP API
- compute: Lambda
- DB: DynamoDB

詳細な手順と運用メモ:

- `docs/aws-dynamo-manual-setup.md`
- `docs/aws-dynamo-migration-plan.md`
- `docs/dynamo-migration-project-plan.md`
- `docs/dynamodb-phase2-design.md`
- `docs/aws-dynamo-phase3-architecture.md`
- `docs/old/aws-manual-setup.md`
- `docs/old/aws-migration-plan.md`

## デプロイの反映単位

- frontend は Amplify に接続済みブランチへの push で自動 build / deploy されます
- backend / API Gateway / Cognito / DynamoDB の変更は自動反映されません
