# AWS Manual Setup Guide

このドキュメントは、`reflect-journal` を AWS 上で手動構築するための手順書です。

前提:

- AWS アカウントは作成済み
- 東京リージョン `ap-northeast-1` を使う
- IaC は使わず、AWS コンソール中心で構築する
- backend は `API Gateway HTTP API -> Lambda -> RDS Data API -> Aurora PostgreSQL Serverless v2`
- auth は `Cognito User Pool`
- frontend は `Amplify Hosting`

この手順は、AWS に不慣れな人でも再現しやすいように、できるだけ順番を崩さずに書いています。

## 0. 全体像

作るものは次の 6 つです。

1. 請求アラートと管理者以外の作業ユーザー
2. Cognito User Pool
3. Aurora PostgreSQL Serverless v2
4. Lambda
5. API Gateway HTTP API
6. Amplify Hosting

作成順は必ずこの順を推奨します。

理由:

- Cognito が先にないと JWT authorizer を設定できない
- Aurora が先にないと Lambda の環境変数を埋められない
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

個人開発でも、普段の作業をルートユーザーで続けるのは避けたほうが安全です。

### 1-3. 予算アラートを設定する

特に Aurora は、設定を誤ると想定より課金が出やすいです。

最低限:

- 月額予算 `10 USD` か `20 USD`
- その 80% 到達時にメール通知
- 100% 到達時にメール通知

### 1-4. 命名規則を決める

手動構築では名前が重要です。

このドキュメントでは以下を例にします。

- project: `reflect-journal`
- env: `prod`
- region: `ap-northeast-1`

推奨リソース名:

- Cognito User Pool: `reflect-journal-prod-user-pool`
- Cognito App Client: `reflect-journal-prod-web-client`
- Lambda: `reflect-journal-prod-api`
- API Gateway: `reflect-journal-prod-http-api`
- Aurora Cluster: `reflect-journal-prod-aurora`
- Secret: `reflect-journal/prod/aurora`
- Amplify App: `reflect-journal`

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
- Aurora cluster ARN
- Aurora secret ARN
- Aurora database name

おすすめ:

- 1Password
- Notion
- `docs/aws-secrets-private.md` のような未コミット個人メモ

機密情報そのものは Git に commit しません。

## 3. Cognito User Pool を作る

2026-03-17 時点の Cognito コンソールでは、`Create user pool` 画面で次をまとめて設定する UI になっています。

- User Pool
- App Client
- サインイン識別子
- 自己登録の可否
- Return URL

古い記事では「User Pool を作ったあとに App Client を別画面で作る」手順が出てきますが、今の UI では最初から一体で作る前提で進めて問題ありません。

### 3-1. コンソールを開く

1. AWS コンソールで `Cognito` を開く
2. 左メニューで `User pools` を開く
3. `Create user pool` を押す

### 3-2. 作成画面で入れる値

画面上部の `アプリケーションのリソースを設定する` で、以下のように設定します。

#### アプリケーションタイプ

- `シングルページアプリケーション (SPA)`

#### アプリケーション名

- `reflect-journal-prod-web-client`

#### サインイン識別子

- `メールアドレス`

電話番号やユーザー名は最初は不要です。

#### 自己登録

- `自己登録を有効化`: オフ

今回の要件では、一般ユーザーが勝手にサインアップできないようにします。

#### サインアップのための必須属性

- `email`

#### Return URL

ローカル開発用として、まず次を入れます。

```text
http://localhost:3000
```

このリポジトリの Vite 開発サーバーはデフォルトの `5173` ではなく、`3000` を使っています。

また、Cognito の callback URL は原則 `https` が必要ですが、ローカル開発用途の `http://localhost` は例外的に許可されます。

#### 補足

- Amplify をまだ作っていなくても、ここでは `http://localhost:3000` を入れて先に進めてよい
- 後で Amplify の URL が決まったら、app client の callback URL に追加する

### 3-3. サインイン方式と自己登録の方針

最初は email ベースが扱いやすいです。

今回の方針は次の通りです。

- sign-in identifier は `email`
- self sign-up は無効
- 管理者がユーザーを作成する

この設定は AWS ドキュメント上の `admin create user only` の方針に対応します。

### 3-4. セキュリティ設定

最初は過度に複雑にしなくて構いません。

推奨:

- MFA: いったん `Optional` か `Off`
- Password policy: デフォルトで可
- Account recovery: `Email only`

MFA はあとからでも有効化できます。

### 3-5. 作成後に確認する値

User Pool 作成後、まず次を控えます。

- User Pool ID
- App Client ID
- Cognito domain
- Allowed callback URL
- region

今の UI では、Cognito domain が自動生成されることがあります。

例:

```text
https://ap-northeast-1xxxxx.auth.ap-northeast-1.amazoncognito.com
```

この自動生成ドメインは、そのまま使って問題ありません。

重要なのは、これは主に managed login / Hosted UI のための URL であり、最終的なアプリ本体の URL ではないことです。

### 3-6. ドメインについての注意

現在の UI では、User Pool 作成時に Cognito domain が自動で作られることがあります。

このときの注意:

- `Cognito ドメイン` セクションの `編集` では、ドメイン名そのものを変更できない場合がある
- `編集` で変えられるのは、ブランディングバージョンだけのことがある
- いまの段階では、自動生成ドメインをそのまま使えばよい

つまり、Cognito domain の見た目は後回しで構いません。

#### カスタムドメインについて

`カスタムドメイン` は、独自ドメインと ACM 証明書がある場合に使います。

例:

- `auth.example.com`

個人開発の初期段階では不要です。

#### パスキー編集画面の `サードパーティードメイン` について

これはログインページの URL 名を変える設定ではありません。

これは passkey / relying party ID 用の設定なので、今回の目的では触らないでください。

今の段階では、次の方針で進めます。

- 自動生成された Cognito domain をそのまま使う
- `パスキー -> サードパーティードメイン` は変更しない
- custom domain も後回し

### 3-7. issuer URL をメモする

API Gateway の JWT authorizer で必要になります。

東京リージョンなら形式は通常こうです。

```text
https://cognito-idp.ap-northeast-1.amazonaws.com/<USER_POOL_ID>
```

### 3-8. ログインページ URL の考え方

作成後の画面に `ログインページを表示` があれば、それを使うのが一番簡単です。

手動で組み立てる場合、ログイン URL は通常こうなります。

```text
https://<COGNITO_DOMAIN>/oauth2/authorize?response_type=code&client_id=<APP_CLIENT_ID>&redirect_uri=http://localhost:3000
```

ログインページの URL は frontend 本体の URL ではなく、Cognito の認証ページの URL です。

### 3-9. 管理者ユーザーを 1 人作る

1. User Pool を開く
2. `Users` を開く
3. `Create user` を押す
4. email を入力
5. 一時パスワードを発行する

最初のログイン確認を必ずしておきます。

### 3-10. 一時パスワードでログインするときの注意

管理者作成ユーザーは、最初のログインで一時パスワードを入力したあと、新しいパスワードへ変更する画面に進むのが通常です。

もし認証に失敗する場合、設定ミスではなく一時パスワード文字列のコピーミスであることがあります。

特に自動生成パスワードは:

- 似た文字が混ざりやすい
- 記号が見分けにくい
- メールからコピーすると余計な空白が入ることがある

実運用上、初回確認を確実にしたいなら、ユーザー作成時に一時パスワードを自分で分かりやすい値にするほうが扱いやすいです。

### 3-11. Cognito で最低限確認できていればよいこと

以下が確認できていれば、この時点では十分です。

- User Pool 作成済み
- App Client 作成済み
- callback URL に `http://localhost:3000` が入っている
- 管理者作成ユーザーで初回ログインが成功している
- User Pool ID / App Client ID / Cognito domain / Issuer URL をメモ済み

## 4. Aurora PostgreSQL Serverless v2 を作る

このセクションは、実際に東京リージョンの RDS コンソールで作成したときの UI に合わせて更新しています。

### 4-1. RDS コンソールを開く

1. AWS コンソールで `RDS` を開く
2. `Databases` を開く
3. `Create database` を押す

### 4-2. 作成方式

設定:

- `フル設定`
- Engine type: `Amazon Aurora`
- Edition: `Aurora PostgreSQL-Compatible Edition`

### 4-3. Serverless v2 を選ぶ

設定:

- DB cluster identifier: `reflect-journal-prod-aurora`
- DB instance class: `Serverless v2`

Aurora PostgreSQL のバージョンは、東京リージョンで `RDS Data API` 対応のものを選びます。

古すぎるバージョンは避けてください。

実際の作成画面では、次の設定で問題ありませんでした。

- Engine version: `Aurora PostgreSQL (Compatible with PostgreSQL 17.4)`
- `Babelfish for PostgreSQL` はオフ
- `Aurora Limitless Database` はオフ
- `RDS 延長サポート` はオフ

### 4-4. テンプレート

設定:

- `開発/テスト`

個人利用の初期構築では `本番稼働用` ではなく `開発/テスト` を選びます。

理由:

- デフォルト構成が軽い
- 不要な高可用性寄り設定を避けやすい
- コストを抑えやすい

### 4-5. 認証情報

設定:

- DB cluster identifier: `reflect-journal-prod-aurora`
- Master username: `reflect_admin`
- Credentials management: `AWS Secrets Manager で管理 - 最も安全`
- KMS key: デフォルトのままで可
- `IAM データベース認証`: オフ
- `Kerberos 認証`: オフ

今回の構成では、Secrets Manager に保存された資格情報を Lambda から参照する前提です。

### 4-6. クラスターストレージと容量

設定:

- Cluster storage: `Aurora スタンダード`
- `Aurora I/O 最適化` は選ばない
- DB instance class: `Serverless v2`
- 最小キャパシティ (ACU): `0.5`
- 最大キャパシティ (ACU): `1`
- `Aurora レプリカを作成しない`

注意:

- 作成画面では最大 ACU が `128` など大きい値になっていることがあります
- そのままだと個人開発には大きすぎるので、必ず `1` に下げる
- この構成では `最小 0.5 ACU` のため、一時停止は使えない表示でも問題ありません

### 4-7. ネットワーク

接続関連の設定は、次の値で進めます。

- `EC2 コンピューティングリソースに接続しない`
- Network type: `IPv4`
- VPC: `Default VPC`
- DB subnet group: `デフォルト`
- Public access: `なし`
- VPC security group: 既存の `default`
- Availability Zone: `指定なし`
- `RDS Proxy を作成`: オフ

Lambda から Data API を使うだけなら、Lambda を VPC に入れずに済むため、最初の構成として扱いやすいです。

### 4-8. Data API を有効にする

作成画面の `接続` セクションにある:

- `RDS Data API の有効化`

には **必ずチェックを入れます**。

ここは重要です。これを有効化しないと backend の実装がそのままでは動きません。

### 4-9. 監視設定

最初は最小限にします。

設定:

- Database insights: `スタンダード`
- `Performance Insights`: オフ
- `拡張モニタリング`: オフ
- `ログのエクスポート`: すべてオフ
- `Babelfish`: オフ

理由:

- 監視系は後から有効化できる
- 初回は DB を動かすことを優先する
- コストと設定の複雑さを抑える

### 4-10. 作成後にメモする

作成が終わったら次を控えます。

- cluster ARN
- writer endpoint
- secret ARN
- database name

今回の構成では、最終的に次の 3 つが Lambda の環境変数に必要です。

- `DATABASE_ARN`
- `DATABASE_SECRET_ARN`
- `DATABASE_NAME`

RDS の画面上では、だいたい次に対応します。

- `Amazon リソースネーム (ARN)`
  - `DATABASE_ARN`
- `マスター認証情報 ARN`
  - `DATABASE_SECRET_ARN`
- `データベース名`
  - `DATABASE_NAME`

## 5. DB schema を適用する

schema ファイルは `backend/schema.sql` を使います。

### 5-1. 今回のおすすめ

今回の構成では、CloudShell を 2 種類使い分けるのが一番分かりやすいです。

- 通常 CloudShell
  - AWS API を叩く用途
  - 例: `aws rds ...`, `aws secretsmanager ...`
- VPC CloudShell
  - Aurora の private endpoint に直接 `psql` で接続する用途

実際に試した結果:

- VPC CloudShell は DB には届く
- ただし AWS API や外部 URL へのアクセスが通らないことがある
- 通常 CloudShell は AWS API は通るが、private DB endpoint には届かないことがある

このため、役割分担して使います。

### 5-2. Data API の有効確認

**通常 CloudShell** で確認します。

実行コマンド:

```bash
aws --region ap-northeast-1 --no-cli-pager rds describe-db-clusters \
  --db-cluster-identifier reflect-journal-prod-aurora \
  --query 'DBClusters[0].HttpEndpointEnabled' \
  --output text
```

期待値:

```text
True
```

`True` なら Data API 有効化済みです。

### 5-3. CloudShell の使い分け

#### 通常 CloudShell

AWS コンソール右上などから普通に開く CloudShell です。

用途:

- `aws sts get-caller-identity`
- `aws rds describe-db-clusters`
- `aws secretsmanager get-secret-value`

#### VPC CloudShell

RDS の接続画面から起動する CloudShell VPC environment です。

用途:

- `psql` で DB に直接入る
- `schema.sql` を作る
- `psql -f schema.sql` で流す

### 5-4. VPC CloudShell で DB 接続

VPC CloudShell 側では、`curl` で CA 証明書を取りに行けないことがあります。

そのため、初回の schema 適用は `sslmode=require` で進めるのが簡単です。

接続コマンド:

```bash
psql "host=reflect-journal-prod-aurora.cluster-c5meiauyuhag.ap-northeast-1.rds.amazonaws.com port=5432 dbname=postgres user=reflect_admin sslmode=require"
```

パスワードは、Secrets Manager に保存されている master secret の値を使います。

#### パスワードの確認

**通常 CloudShell** で取得するか、Secrets Manager のコンソール画面から確認します。

CloudShell で確認する例:

```bash
aws --region ap-northeast-1 --no-cli-pager secretsmanager get-secret-value \
  --secret-id '<DATABASE_SECRET_ARN>' \
  --query SecretString \
  --output text
```

もし VPC CloudShell 側で `aws secretsmanager ...` が固まる場合は、通常 CloudShell か Secrets Manager コンソールで password を確認し、VPC CloudShell の `psql` に手入力します。

### 5-5. `schema.sql` を作る場所に注意

`schema.sql` は **VPC CloudShell の shell 上で作ります**。

注意:

- `postgres=>` のような表示になっているときは `psql` の中です
- その状態で `cat > schema.sql` を打つと SQL として解釈されて失敗します
- まず `\q` で `psql` を抜けて、shell に戻ってから作業します

`schema.sql` を作るコマンド:

```bash
cat > schema.sql
```

その後、`backend/schema.sql` の内容を貼り付けて、最後に `Ctrl + D` を押します。

### 5-6. schema を適用する

**VPC CloudShell** で実行します。

ファイル:

- `backend/schema.sql`

実行コマンド:

```bash
psql "host=reflect-journal-prod-aurora.cluster-c5meiauyuhag.ap-northeast-1.rds.amazonaws.com port=5432 dbname=postgres user=reflect_admin sslmode=require" -f schema.sql
```

成功すると、`CREATE TABLE` や `CREATE INDEX` が返ります。

### 5-7. テーブル作成確認

**VPC CloudShell** で実行します。

```bash
psql "host=reflect-journal-prod-aurora.cluster-c5meiauyuhag.ap-northeast-1.rds.amazonaws.com port=5432 dbname=postgres user=reflect_admin sslmode=require" -c '\dt'
```

適用後、次のテーブルが作られていることを確認します。

- `users`
- `journal_days`
- `journal_cards`
- `weekly_summaries`
- `monthly_summaries`
- `yearly_summaries`

### 5-8. 今回確認できた実績

実際にこの手順で、以下のテーブル作成までは確認済みです。

- `users`
- `journal_days`
- `journal_cards`
- `weekly_summaries`
- `monthly_summaries`
- `yearly_summaries`

## 6. Lambda を作る

### 6-1. 先にローカルで build する

リポジトリルートで:

```bash
npm install
npm run backend:build
```

出力先:

- `backend/dist/functions/api/handler.js`

### 6-2. zip を作る

例:

```bash
cd backend/dist
zip -r function.zip .
```

作成される zip を Lambda にアップロードします。

### 6-3. Lambda 関数を作る

1. AWS コンソールで `Lambda` を開く
2. `Create function`
3. `Author from scratch`

設定:

- Function name: `reflect-journal-prod-api`
- Runtime: `Node.js 20.x`
- Architecture: `x86_64` で可

### 6-4. ハンドラー設定

アップロード後、Handler を次に設定します。

```text
functions/api/handler.handler
```

理由:

- zip の中に `functions/api/handler.js` があり
- そのファイルの `export const handler` を呼び出すため

### 6-5. 環境変数を設定する

Lambda の `Configuration -> Environment variables` で以下を追加します。

- `AWS_REGION=ap-northeast-1`
- `DATABASE_ARN=<Aurora cluster ARN>`
- `DATABASE_SECRET_ARN=<Secrets Manager secret ARN>`
- `DATABASE_NAME=<database name>`
- `CORS_ALLOW_ORIGIN=<frontend domain>`

開発中は `CORS_ALLOW_ORIGIN=*` でも構いませんが、本番では Amplify の domain に絞るほうが安全です。

### 6-6. IAM 権限を付与する

Lambda execution role に次を付けます。

- CloudWatch Logs への出力権限
- `rds-data` 実行権限
- `secretsmanager:GetSecretValue`

最小限の考え方:

- 対象の Aurora cluster ARN
- 対象の Secret ARN

にだけ絞る

### 6-7. テスト実行

Lambda のコンソールで test event を作る前に、まず API Gateway 経由で確認するほうが今回の構成には合っています。

ただし、Lambda 単体で試したい場合は API Gateway event v2 形式で event を作る必要があります。

## 7. API Gateway HTTP API を作る

### 7-1. API を作る

1. AWS コンソールで `API Gateway` を開く
2. `HTTP API` を選ぶ
3. `Build`

設定:

- API name: `reflect-journal-prod-http-api`

### 7-2. Lambda integration を追加する

先ほど作成した Lambda:

- `reflect-journal-prod-api`

を integration として紐づけます。

### 7-3. JWT authorizer を作る

API Gateway の `Authorizers` で `JWT authorizer` を追加します。

必要な値:

- Issuer URL:
  `https://cognito-idp.ap-northeast-1.amazonaws.com/<USER_POOL_ID>`
- Audience:
  `<COGNITO_APP_CLIENT_ID>`

authorizer 名の例:

- `cognito-jwt`

### 7-4. route を作る

最低限必要な route:

- `GET /health`
- `GET /bootstrap`
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

設定ルール:

- `GET /health` は authorizer なしでもよい
- それ以外は JWT authorizer を付ける

### 7-5. stage を確認する

最初は default stage で構いません。

API 作成後に発行される invoke URL をメモします。

例:

```text
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
```

## 8. API の疎通確認

### 8-1. まず health を確認する

ブラウザまたは curl で:

```bash
curl https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/health
```

期待値:

- 200
- `{ "data": { "status": "ok", "service": "reflect-journal-backend" } }`

### 8-2. 認証付き API を確認する

次は Cognito でログインし、access token を使って `/bootstrap` を呼びます。

access token が取得できたら:

```bash
curl \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/bootstrap
```

期待値:

- 200
- `{ data: { days: [], weeklySummaries: [], monthlySummaries: [], yearlySummaries: [] } }`

### 8-3. エラーが出たときの見る場所

順番:

1. API Gateway の route 設定
2. JWT authorizer の issuer / audience
3. Lambda の CloudWatch Logs
4. Lambda 環境変数
5. Aurora ARN / Secret ARN
6. Data API が有効か

## 9. Amplify Hosting を作る

### 9-1. GitHub 連携

1. AWS コンソールで `Amplify` を開く
2. `New app`
3. `Host web app`
4. GitHub repository を接続

### 9-2. build 設定

frontend は Vite なので、通常は Amplify が自動検出できます。

必要なら build settings で以下に近い設定にします。

- install: `npm ci`
- build: `npm run build`
- artifact: `dist`

### 9-3. frontend の環境変数

Amplify 側で最低限必要になる値:

- `VITE_API_BASE_URL=<API Gateway invoke URL>`
- `VITE_REPOSITORY_DRIVER=api`

Cognito 実装を frontend に追加したあとには、さらに以下も必要になります。

- `VITE_COGNITO_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_APP_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`

## 10. frontend の Cognito 連携

注意:

2026-03-16 時点のこのリポジトリでは、frontend の auth はまだ mock 実装です。

対象ファイル:

- `src/auth/AuthContext.tsx`
- `src/auth/authSession.ts`

AWS 側を先に作っても、frontend に本物の Cognito ログインを実装しない限り、ブラウザから本番 API を正しく叩けません。

つまり AWS 側の作成と並行して、frontend の Cognito 対応が別途必要です。

## 11. 作成後チェックリスト

全部終わったら、次を確認します。

- `GET /health` が 200
- access token 付き `GET /bootstrap` が 200
- card 作成 API が 200
- day summary 更新 API が 200
- year summary 更新 API が 200
- Aurora にデータが実際に入る
- CloudWatch Logs に致命的エラーが出ていない
- Amplify の frontend から API に接続できる

## 12. よくある詰まりどころ

### 12-1. `/health` は通るが `/bootstrap` が 401

見る場所:

- API Gateway JWT authorizer の issuer
- API Gateway JWT authorizer の audience
- 送っている token が `id token` ではなく `access token` か

### 12-2. Lambda が DB に繋がらない

見る場所:

- `DATABASE_ARN`
- `DATABASE_SECRET_ARN`
- `DATABASE_NAME`
- Data API 有効化
- Lambda role の `rds-data` 権限
- Lambda role の `secretsmanager:GetSecretValue`

### 12-3. CORS エラーが出る

見る場所:

- Lambda の `CORS_ALLOW_ORIGIN`
- API Gateway 経由で返っているレスポンスヘッダ
- frontend の domain が変わっていないか

### 12-4. schema 適用後にテーブルが見えない

見る場所:

- 接続先 DB 名
- 適用先 cluster
- 適用した schema が本当に `backend/schema.sql` か

## 13. この順番で進める

迷ったら、次の順で進めてください。

1. Cognito User Pool
2. テストユーザー作成
3. Aurora PostgreSQL Serverless v2
4. Data API 有効化
5. schema 適用
6. Lambda
7. API Gateway HTTP API
8. `/health` 確認
9. `/bootstrap` 確認
10. Amplify Hosting
11. frontend の Cognito 対応

## 参考リンク

- Cognito user pool の admin create user only:
  https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-admin-create-user-policy.html
- AdminCreateUser API:
  https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html
- API Gateway HTTP API JWT authorizer:
  https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- Aurora Data API の有効化:
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.enabling.html
- Aurora Data API の制約:
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.limitations.html
- Data API の対応リージョン:
  https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.Data_API.html
