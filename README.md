# Reflect Journal

ローカルで動作する振り返り用ジャーナルアプリです。

## セットアップ

前提: Node.js

1. 依存関係をインストール
   `npm install`
2. 開発サーバーを起動
   `npm run dev`

## スクリプト

- `npm run dev`: 開発サーバー起動（`http://localhost:3000`）
- `npm run backend:dev`: backend API 雛形を起動（`http://localhost:4000`）
- `npm run build`: 本番ビルド作成
- `npm run preview`: ビルド結果をローカル確認
- `npm run lint`: TypeScript 型チェック

## GitHub Pages で公開

1. リポジトリを GitHub に push
2. GitHub の `Settings > Pages` で `Source: GitHub Actions` を選択
3. `main` ブランチへ push すると `.github/workflows/deploy-pages.yml` が自動実行され、Pages にデプロイされます

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

## API Contract

- 将来の backend API に向けた client contract は `src/contracts/journalApi.ts` に定義しています
- 仕様メモは `docs/api-contract.md` を参照してください

## Auth Context

- `src/auth/AuthContext.tsx` に mock auth ベースの auth context を用意しています
- `currentUser / login / logout` を扱え、将来 Cognito に差し替え可能です
- `apiClient` は auth session に access token があれば `Authorization: Bearer ...` を自動で付与します

## Backend Skeleton

- `backend/` に App Runner 配備を見据えた API 雛形を追加しています
- ローカル起動は `npm run backend:dev`
- エンドポイント一覧とヘルスチェックは `backend/README.md` を参照してください

## AWS Migration Plan

- AWS 移行方針と DynamoDB 保存設計は `docs/aws-migration-plan.md` に整理しています
