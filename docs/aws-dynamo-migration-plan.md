# AWS Dynamo Migration Plan

## このドキュメントの位置づけ

このドキュメントは、`reflect-journal-dynamo` の AWS 構成と移行方針をまとめるための新しい計画書です。

前提:

- 既存 `reflect-journal` は Aurora / Data API 前提のまま維持する
- `reflect-journal-dynamo` は DynamoDB 前提で新規構築する
- 既存 AWS リソースの in-place 変更は行わない

参照:

- DynamoDB 設計: `docs/dynamodb-phase2-design.md`
- AWS 構成案: `docs/aws-dynamo-phase3-architecture.md`
- 旧 Aurora 移行計画: `docs/old/aws-migration-plan.md`

## 現時点の結論

- 新環境は `Amplify + Cognito + API Gateway + Lambda + DynamoDB`
- 初回表示は月単位取得を前提にする
- backend は `BACKEND_REPOSITORY_DRIVER=dynamodb` を本番候補とする
- 追加開発時はローカルで事前確認してから AWS へ反映する

## 今後ここに整理する内容

1. 新 AWS リソース作成方針
2. 既存環境との分離ルール
3. 反映順
4. 環境変数
5. IAM 権限
6. 本番確認項目
