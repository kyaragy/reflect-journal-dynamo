# Reflect Journal Dynamo

TODO 管理と新版ジャーナリング（思考振り返り PoC）を提供する React + TypeScript アプリです。  
現在の運用対象は `TODO` と `新版ジャーナリング（/v2/*）` です。旧版ジャーナリングは削除済みです。

## クイックスタート（ローカル）

前提:

- Node.js 20 以上推奨
- npm

```bash
npm install
cp .env.local.example .env.local
BACKEND_REPOSITORY_DRIVER=memory npm run backend:dev
npm run dev
```

起動先:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

`.env.local` のローカル API 接続例:

```env
VITE_REPOSITORY_DRIVER=api
VITE_AUTH_MODE=local
VITE_API_BASE_URL=http://localhost:4000
```

## 主要スクリプト

- `npm run dev`: frontend 開発サーバー
- `npm run backend:dev`: backend ローカルサーバー
- `npm run dynamodb:local:up`: DynamoDB Local 起動（Docker）
- `npm run dynamodb:local:init`: DynamoDB Local 用テーブル初期化
- `npm run dynamodb:local:down`: DynamoDB Local 停止
- `npm run test`: frontend/backend テスト実行
- `npm run lint`: TypeScript 型チェック
- `npm run build`: frontend ビルド
- `npm run backend:build`: Lambda 配布物ビルド

## リポジトリ切替と認証

- `VITE_REPOSITORY_DRIVER=localStorage`（既定）: ブラウザ保存
- `VITE_REPOSITORY_DRIVER=api`: backend API 使用
- `VITE_AUTH_MODE=local`: API モードでも Cognito 認証を無効化（ローカル開発向け）
- `VITE_AUTH_MODE=cognito`: Cognito Hosted UI 認証を使用

## ドキュメント

- セットアップ・環境構築: `docs/setup-and-environment.md`
- 機能説明（現行導線）: `docs/feature-overview.md`
- API 契約概要: `docs/api-contract.md`
- AWS 手動構築メモ: `docs/aws-dynamo-manual-setup.md`
