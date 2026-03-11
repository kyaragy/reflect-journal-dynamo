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
- `npm run build`: 本番ビルド作成
- `npm run preview`: ビルド結果をローカル確認
- `npm run lint`: TypeScript 型チェック

## GitHub Pages で公開

1. リポジトリを GitHub に push
2. GitHub の `Settings > Pages` で `Source: GitHub Actions` を選択
3. `main` ブランチへ push すると `.github/workflows/deploy-pages.yml` が自動実行され、Pages にデプロイされます

## データ永続化の構成

- UI コンポーネントは `useJournalStore` を通じてデータを扱います
- 永続化の実装は `src/repositories/` に集約され、現状は `localStorageRepository` が `localStorage` を担当します
- 将来 API / DB に移行する場合は repository 実装を差し替えることで、UI 側の変更を最小限に抑えられます

## Repository 切替

- デフォルトでは `localStorageRepository` を利用します
- `VITE_REPOSITORY_DRIVER=api` を指定すると `apiRepository` に切り替えられます
- API のベース URL は `VITE_API_BASE_URL` で設定できます
