# AWS Dynamo Manual Setup Guide

このドキュメントは、`reflect-journal-dynamo` を AWS 上で新規構築し、その後の追加改修でも構成を追えるようにするための手順書兼運用メモです。

前提:

- AWS アカウントは作成済み
- 東京リージョン `ap-northeast-1` を使う
- IaC は使わず、AWS コンソール中心で構築する
- backend は `API Gateway HTTP API -> Lambda -> DynamoDB`
- auth は `Cognito User Pool`
- frontend は `Amplify Hosting`
- 既存 `reflect-journal` の AWS 環境は変更しない
- AWS 上に新規作成する `reflect-journal-dynamo` 環境は `prod` のみとする

この手順は、旧 Aurora 版の手動構築資料と同じく、AWS に不慣れでも追いやすい粒度を維持する方針で書いています。

## 0-1. このドキュメントの使い方

このドキュメントは次の 2 つを兼ねています。

- `reflect-journal-dynamo` の初回 AWS 手動構築手順
- 新しいチャットでも現 AWS 構成を説明できるようにするための引き継ぎ資料

方針:

- 実際のクレデンシャル、URL、App Client ID、account ID は書かない
- 代わりに `https://<AMPLIFY_APP_URL>` や `<COGNITO_APP_CLIENT_ID>` のようなプレースホルダで表す
- 値そのものは個人メモやパスワードマネージャで管理する
- AWS 環境は `prod` だけを管理対象とし、開発時の事前確認はローカル環境で行う

参照:

- アーキテクチャ方針: `docs/aws-dynamo-phase3-architecture.md`
- データ設計方針: `docs/dynamodb-phase2-design.md`
- 旧 Aurora 構成の詳細資料: `docs/old/aws-manual-setup.md`

## 0-2. 現在の想定構成サマリー

現時点の想定構成は次のとおりです。

- frontend: Amplify Hosting
- auth: Cognito User Pool + Hosted UI
- frontend auth flow: Authorization Code Flow + PKCE
- API: API Gateway HTTP API
- backend: Lambda
- DB: DynamoDB

アプリの動作方針:

- `VITE_REPOSITORY_DRIVER=api` のときは frontend で Cognito 認証を必須にする
- 未認証ならカレンダー描画前に Hosted UI にリダイレクトする
- API Gateway は `GET /health` だけ認証なし、それ以外は JWT authorizer 付き
- Lambda は `requestContext.authorizer.jwt.claims.sub` を `user_id` として扱う
- 初回表示は `GET /months/:monthKey` を中心にする

## 0-3. 何が自動反映され、何が手動反映か

この構成でも、変更内容によって反映方法が異なります。

自動反映されるもの:

- `main` へ push した frontend の変更
- Amplify に接続済みブランチの build / deploy

手動反映が必要なもの:

- Lambda のコード差し替え
- Lambda 環境変数の変更
- API Gateway の route / authorizer / CORS 設定
- Cognito の App Client 設定
- DynamoDB の設定変更
- IAM 権限の変更

backend を反映するときの基本コマンド:

```bash
npm run backend:build
cd backend/dist
zip -r function.zip .
```

その後、生成した `backend/dist/function.zip` を Lambda に再アップロードします。

## 0. 全体像

作るものは次の 5 つです。

1. Cognito User Pool
2. DynamoDB Table
3. Lambda
4. API Gateway HTTP API
5. Amplify Hosting

作成順は必ずこの順を推奨します。

理由:

- Cognito が先にないと JWT authorizer を設定できない
- DynamoDB が先にないと Lambda の環境変数を埋められない
- Lambda が先にないと API Gateway の integration を作れない
- API が先にないと frontend の接続先を確定できない

## 1. 作業前の準備

### 1-1. リージョンを固定する

AWS コンソール右上のリージョン選択で、`Asia Pacific (Tokyo) ap-northeast-1` を選びます。

以後、基本的にすべての作業を東京リージョンで行います。

### 1-2. ルートユーザーを日常利用しない

最初にやること:

- ルートユーザーに `MFA` を設定する
- 日常作業用に IAM ユーザーまたは IAM Identity Center の作業アカウントを作る

### 1-3. 予算アラートを設定する

DynamoDB は Aurora より扱いやすいですが、API Gateway, Lambda, Amplify, Cognito を含めると意図しない課金は起こりえます。

最低限:

- 月額予算 `10 USD` か `20 USD`
- その 80% 到達時にメール通知
- 100% 到達時にメール通知

### 1-4. 命名規則を決める

このドキュメントでは以下を例にします。

- project: `reflect-journal-dynamo`
- env: `prod`
- region: `ap-northeast-1`

推奨リソース名:

- Cognito User Pool: `reflect-journal-dynamo-prod-user-pool`
- Cognito App Client: `reflect-journal-dynamo-prod-web-client`
- Lambda: `reflect-journal-dynamo-prod-api`
- API Gateway: `reflect-journal-dynamo-prod-http-api`
- DynamoDB Table: `reflect-journal-dynamo-prod-main`
- Amplify App: `reflect-journal-dynamo`

重要:

- 既存 `reflect-journal-*` の名前を再利用しない
- 既存環境と混ざる名前を使わない

## 2. 事前に記録する値

以下の値は、作成したら必ずメモしてください。

- AWS account ID
- region
- Cognito User Pool ID
- Cognito User Pool domain
- Cognito App Client ID
- Cognito issuer URL
- Lambda function name
- Lambda execution role ARN
- API Gateway URL
- API Gateway JWT authorizer audience
- DynamoDB table name
- Amplify App URL

おすすめ:

- 1Password
- Notion
- `docs/aws-secrets-private.md` のような未コミット個人メモ

## 2-1. Git や公開ドキュメントに書かないもの

次の値は README や docs 配下にそのまま書かないでください。

- 実際の Cognito domain
- 実際の App Client ID
- 実際の User Pool ID
- 実際の API Gateway invoke URL
- 実際の account ID
- access token / refresh token / authorization code

## 3. Cognito User Pool を作る

### 3-1. コンソールを開く

1. AWS コンソールで `Cognito` を開く
2. 左メニューで `User pools` を開く
3. `Create user pool` を押す

### 3-2. 作成画面で入れる値

#### アプリケーションタイプ

- `シングルページアプリケーション (SPA)`

#### アプリケーション名

- `reflect-journal-dynamo-prod-web-client`

#### サインイン識別子

- `メールアドレス`

#### 自己登録

- `自己登録を有効化`: オフ

#### サインアップのための必須属性

- `email`

#### Return URL

ローカル開発用として、まず次を入れます。

```text
http://localhost:3000
```

補足:

- Amplify をまだ作っていなくても、ここでは `http://localhost:3000` を入れて先に進めてよい
- 後で Amplify の URL が決まったら callback URL に追加する

### 3-3. セキュリティ設定

推奨:

- MFA: いったん `Optional` か `Off`
- Password policy: デフォルトで可
- Account recovery: `Email only`

### 3-4. 作成後に確認する値

User Pool 作成後、まず次を控えます。

- User Pool ID
- App Client ID
- Cognito domain
- Allowed callback URL
- region

### 3-5. issuer URL をメモする

API Gateway の JWT authorizer で必要になります。

東京リージョンなら形式は通常こうです。

```text
https://cognito-idp.ap-northeast-1.amazonaws.com/<USER_POOL_ID>
```

### 3-6. 管理者ユーザーを 1 人作る

1. User Pool を開く
2. `Users` を開く
3. `Create user` を押す
4. email を入力
5. 一時パスワードを発行する

最初のログイン確認を必ずしておきます。

## 4. DynamoDB Table を作る

### 4-1. DynamoDB コンソールを開く

1. AWS コンソールで `DynamoDB` を開く
2. 左メニューで `Tables` を開く
3. `Create table` を押す

### 4-2. 基本設定

設定:

- Table name: `reflect-journal-dynamo-prod-main`
- Partition key: `PK` / `String`
- Sort key: `SK` / `String`

### 4-3. テーブル設定

この画面では、まず `デフォルト設定` を選んだままで問題ありません。

デフォルト設定で確認したい値:

- `On-demand`
- テーブルクラス: `DynamoDB Standard`
- 暗号化キー管理: `AWS が所有するキー`
- 削除保護: `Off`
- ローカルセカンダリインデックス: なし
- グローバルセカンダリインデックス: なし

AWS 表示上は `On-demand` ですが、この方針書では `PAY_PER_REQUEST` と同じ意味で扱います。

理由:

- 初期段階の個人利用で管理しやすい
- capacity planning を後回しにできる
- 今回のアプリで初期作成時に高度なテーブル設定は不要

### 4-4. タグ

タグは必須ではありません。最初は未設定のままでも問題ありません。

もし付けるなら、後で AWS コンソール上の絞り込みやコスト確認がしやすいように次の程度で十分です。

- `Project = reflect-journal-dynamo`
- `Environment = prod`
- `ManagedBy = manual`

迷う場合は、いったんタグなしで `テーブルの作成` を押して構いません。

### 4-5. 補足設定の考え方

`設定をカスタマイズ` を選ばずに進める場合、追加で触る必要はありません。

画面上の意味としては次の理解で十分です。

- Secondary indexes: なし
  - 今回の PK / SK 設計では、初期段階で GSI は不要
- DynamoDB Streams: オフ
  - Lambda 連携や変更イベント処理は今回使わない
- Point-in-time recovery: いったんオフのままでよい
  - 必要なら本番稼働後に有効化を検討する
- Deletion protection: オフでよい
  - 誤削除が不安なら後で有効化してもよい

つまり、4-2 のキー設定が終わったら、

1. `デフォルト設定` が選ばれていることを確認する
2. `キャパシティーモード = オンデマンド` であることを確認する
3. そのまま `Create table` に進む

で問題ありません。

### 4-6. 作成後にメモする

- table name
- table ARN
- region

今回の backend で最低限必要なのは `JOURNAL_TABLE_NAME` です。

## 5. Lambda を作る

### 5-1. Lambda コンソールを開く

1. AWS コンソールで `Lambda` を開く
2. `Create function` を押す

### 5-2. 基本設定

設定:

- Author from scratch
- Function name: `reflect-journal-dynamo-prod-api`
- Runtime: `Node.js 20.x`
- Architecture: `x86_64` か `arm64`
- Handler: いったんデフォルトのままで作成し、作成後に `functions/api/handler.handler` へ変更する

### 5-3. 実行ロール

最初は次で構いません。

- `Create a new role with basic Lambda permissions`

その後で DynamoDB 権限を追加します。

### 5-4. コードをアップロードする

ローカルで次を実行します。

```bash
npm run backend:build
cd backend/dist
zip -r function.zip .
```

Lambda の `Code` タブから zip をアップロードします。

重要:

- この build では zip の中に `index.js` は作られません
- 実際の entry file は `functions/api/handler.js` です
- そのため、Lambda の handler 設定は `index.handler` ではなく `functions/api/handler.handler` にする必要があります

確認手順:

1. Lambda の `コード` タブを開く
2. 画面を下へスクロールして `ランタイム設定` を開く
3. `編集` を押す
4. Handler を `functions/api/handler.handler` に変更する
5. 保存する

### 5-5. 環境変数

Lambda の `設定 -> 環境変数` で次を設定します。

```text
APP_ENV=prod
JOURNAL_TABLE_NAME=reflect-journal-dynamo-prod-main
CORS_ALLOW_ORIGIN=http://localhost:3000
BACKEND_REPOSITORY_DRIVER=dynamodb
```

補足:

- Amplify 作成前は `CORS_ALLOW_ORIGIN=http://localhost:3000` で進めてよい
- Amplify URL 確定後に本番 origin へ更新する

### 5-6. Lambda 単体テスト

API Gateway に進む前に、まず Lambda 単体で `GET /health` を通します。

1. Lambda の `テスト` タブを開く
2. 新しいテストイベントを作る
3. イベント名は `get-health` など分かりやすい名前にする
4. 次の JSON をそのまま貼る

```json
{
  "version": "2.0",
  "rawPath": "/health",
  "body": null,
  "isBase64Encoded": false,
  "headers": {},
  "requestContext": {
    "requestId": "manual-test-health",
    "http": {
      "method": "GET",
      "path": "/health"
    }
  }
}
```

5. `テスト` を実行する

期待結果:

- statusCode: `200`
- body に `status: ok`
- body の `service` は `reflect-journal-dynamo-backend`

期待される response body の例:

```json
{
  "data": {
    "status": "ok",
    "service": "reflect-journal-dynamo-backend"
  },
  "meta": {
    "requestId": "manual-test-health"
  }
}
```

補足:

- `GET /health` は認証不要なので、authorizer 情報はこのテストイベントに不要
- ここで 200 が返れば、Lambda コードの基本起動と handler 配線は通っている
- `Cannot find module 'index'` が出た場合は、zip の中身と Handler 設定が一致していない
- 今回の構成では Handler は `functions/api/handler.handler` が正しい

## 6. Lambda の IAM 権限を設定する

### 6-1. IAM ロールを開く

1. Lambda の `設定 -> アクセス権限` を開く
2. 実行ロールをクリックする
3. `許可を追加` を押す
4. `インラインポリシーを作成` を選ぶ

補足:

- 既存で付いている `AWSLambdaBasicExecutionRole` はそのまま残して問題ありません
- これは CloudWatch Logs 出力のための基本権限なので、削除しないでください
- 今回はこれに加えて、DynamoDB テーブルアクセス権限を追加します
- 使い回し用の managed policy を新規作成するほどではないため、まずはインラインポリシーで十分です

### 6-2. 最低限必要な DynamoDB 権限

許可するアクション:

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:BatchGetItem`
- `dynamodb:BatchWriteItem`

対象リソース:

- `arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/reflect-journal-dynamo-prod-main`

ポリシーは JSON タブで次を貼ればよいです。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "JournalTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/reflect-journal-dynamo-prod-main"
    }
  ]
}
```

ポリシー名の例:

- `reflect-journal-dynamo-prod-main-access`

必要に応じて追加:

- `dynamodb:TransactWriteItems`

### 6-3. 不要な権限

Aurora 版のような次の権限は不要です。

- `rds-data:*`
- `secretsmanager:GetSecretValue` for DB credentials

## 7. API Gateway HTTP API を作る

### 7-1. API Gateway コンソールを開く

1. AWS コンソールで `API Gateway` を開く
2. `HTTP API` を選ぶ
3. `Build` を押す

### 7-2. 基本設定

設定:

- API name: `reflect-journal-dynamo-prod-http-api`

### 7-3. Lambda integration を追加する

統合先:

- `reflect-journal-dynamo-prod-api`

### 7-4. route を作る

最低限必要な route:

- `GET /health`
- `GET /days/{date}`
- `PUT /days/{date}`
- `PUT /days/{date}/summary`
- `POST /days/{date}/cards`
- `PUT /days/{date}/cards/{cardId}`
- `DELETE /days/{date}/cards/{cardId}`
- `GET /weeks/{weekKey}`
- `PUT /weeks/{weekKey}/summary`
- `GET /months/{monthKey}`
- `PUT /months/{monthKey}/summary`
- `GET /years/{yearKey}`
- `PUT /years/{yearKey}/summary`
- `POST /migration/local-storage-import`

注意:

- 通常利用の初回表示で `GET /bootstrap` は使わない

### 7-5. ステージを設定する

この画面では、まずデフォルトの `$default` ステージをそのまま使って問題ありません。

設定:

- Stage name: `$default`
- Auto deploy: `On`

理由:

- 今回は AWS 上に `prod` しか作らない
- HTTP API では `$default` ステージを使うと URL に stage 名が付きにくく扱いやすい
- route 変更のたびに手動デプロイしなくて済む

つまり、この画面では

1. `$default` が入っていることを確認する
2. `自動デプロイ` がオンであることを確認する
3. `次へ` を押す

で問題ありません。

### 7-6. JWT authorizer を作る

設定:

- Name: `cognito-jwt`
- Identity source: `$request.header.Authorization`
- Issuer: `https://cognito-idp.ap-northeast-1.amazonaws.com/<USER_POOL_ID>`
- Audience: `<COGNITO_APP_CLIENT_ID>`

### 7-7. 認可設定

- `GET /health` は認証なし
- それ以外は `cognito-jwt`

### 7-8. CORS を有効化する

API Gateway の `CORS` 設定で最低限次を入れます。

- Allowed origins:
  - `http://localhost:3000`
  - `https://<AMPLIFY_APP_URL>`
- Allowed methods:
  - `GET`
  - `POST`
  - `PUT`
  - `DELETE`
  - `OPTIONS`
- Allowed headers:
  - `content-type`
  - `authorization`

## 8. Amplify Hosting を作る

### 8-1. Amplify コンソールを開く

1. AWS コンソールで `Amplify` を開く
2. `New app` -> `Host web app` を選ぶ

### 8-2. Git リポジトリを接続する

- `reflect-journal-dynamo` の GitHub リポジトリを接続する
- branch は `main`

### 8-3. 環境変数を設定する

最低限必要な値:

```text
VITE_REPOSITORY_DRIVER=api
VITE_API_BASE_URL=https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com
VITE_AUTH_MODE=cognito
VITE_COGNITO_DOMAIN=https://<COGNITO_DOMAIN>
VITE_COGNITO_APP_CLIENT_ID=<COGNITO_APP_CLIENT_ID>
```

重要:

- Amplify の `VITE_*` 環境変数は build 時に埋め込まれます
- そのため、環境変数を追加・変更した後は再デプロイが必要です

### 8-4. 初回 deploy

Amplify の初回デプロイが終わったら、発行された URL を控えます。

例:

```text
https://main.<AMPLIFY_APP_ID>.amplifyapp.com
```

### 8-5. 環境変数設定後に再デプロイする

Amplify の環境変数を保存しただけでは、すでに配信中の build には反映されません。

次のいずれかで再デプロイします。

1. Amplify コンソールで対象 branch の `Redeploy this version` を実行する
2. `main` に新しい commit を push して再 build させる

確認ポイント:

- 再デプロイ後の build が `Succeeded` になっている
- その build が、環境変数更新後のものになっている

## 9. Cognito に Amplify URL を追加する

Amplify URL が確定したら、Cognito App Client の callback / sign-out URL に次を追加します。

- `https://<AMPLIFY_APP_URL>`

ローカル開発用の `http://localhost:3000` は残して構いません。

補足:

- callback URL には `window.location.origin` と一致する値を入れる
- 今回の frontend 実装では path は付けず、origin のみを使う
- 末尾の `/` の有無がズレると Cognito エラーになりうる
- App Client の OAuth で `Authorization code grant` が有効であることを確認する
- 許可スコープは少なくとも `openid` と `email` を有効にする

## 10. Lambda と API Gateway の CORS を Amplify に合わせる

### 10-1. Lambda の `CORS_ALLOW_ORIGIN` を更新する

Lambda `reflect-journal-dynamo-prod-api` の環境変数で次を更新します。

```text
CORS_ALLOW_ORIGIN=https://<AMPLIFY_APP_URL>
```

### 10-2. API Gateway の CORS を確認する

API Gateway `reflect-journal-dynamo-prod-http-api` の CORS 設定で、Amplify の origin が入っていることを確認します。

## 11. 動作確認

この章は、AWS 上の構築が一通り終わったあとに行う確認です。

ローカル確認自体は別途実施済みであることを前提にします。ローカル確認手順は `README.md` を参照してください。

### 11-1. API 単体確認

確認項目:

- `GET /health` が `200`
- 未認証の保護 API が `401`
- 認証後の `GET /months/:monthKey` が `200`

具体例:

1. API Gateway の invoke URL を控える
2. ブラウザまたは `curl` で `GET /health` を叩く
3. 次に `GET /months/2026-03` のような保護 API を、トークンなしで叩く
4. ここで `401` になることを確認する
5. その後、Amplify 経由で実際にログインし、画面から保護 API が通ることを確認する

補足:

- ここでの `401` は異常ではなく、JWT authorizer が効いている確認です
- `GET /health` だけは認証なし
- `GET /months/:monthKey` などは認証あり

### 11-2. Amplify 上の確認

確認項目:

1. Amplify の URL を開く
2. 未認証なら Hosted UI に飛ぶ
3. Hosted UI でログインする
4. frontend に戻る
5. カレンダーが表示される
6. 当月データ取得が成功する
7. 日次更新、カード更新、月サマリー更新が動く

## 12. よくある詰まりどころ

### 12-1. `/health` は通るが保護 API が 401

見る場所:

- API Gateway JWT authorizer の issuer
- API Gateway JWT authorizer の audience
- `Authorization` ヘッダに access token を送っているか

### 12-2. Lambda が DynamoDB にアクセスできない

見る場所:

- `JOURNAL_TABLE_NAME`
- Lambda role の `dynamodb:*` 権限
- table name の typo
- region の不一致

### 12-3. CORS エラーが出る

見る場所:

- Lambda の `CORS_ALLOW_ORIGIN`
- API Gateway の CORS 設定
- frontend の origin が変わっていないか

### 12-4. Amplify では guest mode のままで認証ガードが効かない

見る場所:

- Amplify の最新デプロイが期待した commit を拾っているか
- Amplify の環境変数
  - `VITE_REPOSITORY_DRIVER=api`
  - `VITE_AUTH_MODE=cognito`
  - `VITE_API_BASE_URL`
  - `VITE_COGNITO_DOMAIN`

### 12-5. Cognito のログイン画面で `Something went wrong` になる

見る場所:

- Cognito App Client の callback URL に Amplify URL が正しく入っているか
- Cognito App Client の sign-out URL に Amplify URL が入っているか
- callback URL が `https://<AMPLIFY_APP_URL>` と完全一致しているか
- Amplify の `VITE_COGNITO_DOMAIN` が Hosted UI domain と一致しているか
- Amplify の `VITE_COGNITO_APP_CLIENT_ID` が今回作成した App Client ID と一致しているか
- Cognito App Client で `Authorization code grant` が有効か
- `openid`, `email` scope が有効か
- Amplify の環境変数変更後に再デプロイ済みか
  - `VITE_COGNITO_APP_CLIENT_ID`

## 13. この順番で進める

迷ったら、次の順で進めてください。

1. Cognito User Pool
2. テストユーザー作成
3. DynamoDB Table
4. Lambda
5. Lambda IAM policy
6. API Gateway HTTP API
7. JWT authorizer
8. `/health` 確認
9. 保護 API 確認
10. Amplify Hosting
11. Cognito callback / sign-out URL に Amplify URL を追加
12. Lambda / API Gateway の CORS を Amplify URL に合わせる
13. frontend 確認

## 14. 追加改修時の運用メモ

このプロジェクトでは、追加改修時に次の順を守ります。

- まずローカルで確認する
- その後に AWS 向け変更を反映する
- 既存 `reflect-journal` の AWS 環境には触れない

## 15. 参考にする旧資料

以下は Aurora 版の詳細資料です。

- `docs/old/aws-manual-setup.md`
- `docs/old/aws-migration-plan.md`

記載粒度や運用メモの細かさは、今後もこのレベルを基準にします。
