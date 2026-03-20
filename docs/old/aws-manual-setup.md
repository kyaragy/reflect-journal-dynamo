# AWS Manual Setup Guide

このドキュメントは、`reflect-journal` を AWS 上で手動構築し、その後の追加改修でも現行構成を追えるようにするための手順書兼運用メモです。

前提:

- AWS アカウントは作成済み
- 東京リージョン `ap-northeast-1` を使う
- IaC は使わず、AWS コンソール中心で構築する
- backend は `API Gateway HTTP API -> Lambda -> RDS Data API -> Aurora PostgreSQL Serverless v2`
- auth は `Cognito User Pool`
- frontend は `Amplify Hosting`

この手順は、AWS に不慣れな人でも再現しやすいように、できるだけ順番を崩さずに書いています。

## 0-1. このドキュメントの使い方

このドキュメントは次の 2 つを兼ねています。

- 初回の AWS 手動構築手順
- 新しいチャットでも現 AWS 構成を説明できるようにするための引き継ぎ資料

方針:

- 実際のクレデンシャル、ARN、App Client ID、API URL、独自ドメイン、アカウント ID は書かない
- 代わりに `<DATABASE_ARN>` や `https://<AMPLIFY_APP_URL>` のようなプレースホルダで表す
- 値そのものは個人メモやパスワードマネージャで管理する

## 0-2. 現在の本番構成サマリー

現時点の本番構成は次のとおりです。

- frontend: Amplify Hosting
- auth: Cognito User Pool + Hosted UI
- frontend auth flow: Authorization Code Flow + PKCE
- API: API Gateway HTTP API
- backend: Lambda (TypeScript を bundle した zip を手動アップロード)
- DB: Aurora PostgreSQL Serverless v2
- DB access: RDS Data API + Secrets Manager

アプリの動作方針:

- `VITE_REPOSITORY_DRIVER=api` のときは frontend で Cognito 認証を必須にする
- 未認証ならカレンダー描画前に Hosted UI にリダイレクトする
- API Gateway は `GET /health` だけ認証なし、それ以外は JWT authorizer 付き
- Lambda は `requestContext.authorizer.jwt.claims.sub` を `user_id` として扱う

## 0-3. 何が自動反映され、何が手動反映か

この構成では、変更内容によって反映方法が異なります。

自動反映されるもの:

- `main` へ push した frontend の変更
- Amplify に接続済みブランチの build / deploy

手動反映が必要なもの:

- Lambda のコード差し替え
- Lambda 環境変数の変更
- API Gateway の route / authorizer / CORS 設定
- Cognito の App Client 設定
- Aurora / schema の変更
- IAM 権限の変更

backend を反映するときの基本コマンド:

```bash
npm run backend:build
cd backend/dist
zip -r function.zip .
```

その後、生成した `backend/dist/function.zip` を Lambda に再アップロードします。

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

## 2-1. Git や公開ドキュメントに書かないもの

次の値は README や docs 配下にそのまま書かないでください。

- 実際の Cognito domain
- 実際の App Client ID
- 実際の User Pool ID
- 実際の API Gateway invoke URL
- 実際の Aurora cluster ARN
- 実際の Secrets Manager ARN
- 実際の account ID
- DB パスワード
- access token / refresh token / authorization code

将来のチャットで相談するときも、必要なら一部を伏せるか、プレースホルダに置き換えて共有する運用にします。

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
psql "host=<WRITER_ENDPOINT> port=5432 dbname=<DATABASE_NAME> user=<MASTER_USERNAME> sslmode=require"
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
psql "host=<WRITER_ENDPOINT> port=5432 dbname=<DATABASE_NAME> user=<MASTER_USERNAME> sslmode=require" -f schema.sql
```

成功すると、`CREATE TABLE` や `CREATE INDEX` が返ります。

### 5-7. テーブル作成確認

**VPC CloudShell** で実行します。

```bash
psql "host=<WRITER_ENDPOINT> port=5432 dbname=<DATABASE_NAME> user=<MASTER_USERNAME> sslmode=require" -c '\dt'
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

この出力は Lambda 向けに CommonJS 形式です。`Cannot use import statement outside a module` が出た場合は、古い zip を上げている可能性が高いので `npm run backend:build` からやり直してください。

### 6-2. zip を作る

例:

```bash
cd backend/dist
zip -r function.zip .
```

作成される zip を Lambda にアップロードします。

補足:

- zip のルート直下に `functions/` ディレクトリが入る状態にします
- 既に `function.zip` がある場合は、古い zip を上げないように `npm run backend:build` のあとで作り直します

### 6-3. Lambda 関数を作る

1. AWS コンソールで `Lambda` を開く
2. `関数を作成`
3. `一から作成`

設定:

- Function name: `reflect-journal-prod-api`
- Runtime: `Node.js 20.x`
- Architecture: `x86_64`
- 実行ロール: `デフォルトロールを作成`
- コンピューティングタイプ: `Lambda (デフォルト)`
- `関数 URL`: オフ
- `VPC`: オフ
- `コード署名`: オフ
- `AWS KMS カスタマーマネージドキーによる暗号化`: オフ

### 6-4. ハンドラー設定

1. 関数作成後、`コード` タブで zip をアップロードします
2. その後、`コード` タブを開いたまま少し下にスクロールします
3. `ランタイム設定` の `編集` を押します
4. Handler を次に設定します

```text
functions/api/handler.handler
```

理由:

- zip の中に `functions/api/handler.js` があり
- そのファイルの `export const handler` を呼び出すため

補足:

- zip アップロード直後にコンソールの内蔵エディタが赤くなっても、まずは Handler を正しく設定します
- 実際に `Cannot use import statement outside a module` が出た場合は、古い ESM build を上げている可能性が高いので、`npm run backend:build` からやり直して zip を再アップロードします

### 6-5. 環境変数を設定する

Lambda の `設定 -> 環境変数` で以下を追加します。

- `DATABASE_ARN=<Aurora cluster ARN>`
- `DATABASE_SECRET_ARN=<Secrets Manager secret ARN>`
- `DATABASE_NAME=<database name>`
- `CORS_ALLOW_ORIGIN=<frontend domain>`

注意:

- `AWS_REGION` は Lambda の予約済み環境変数なので手動追加しません
- Amplify 未作成の間は `CORS_ALLOW_ORIGIN=http://localhost:3000` で進めてよいです
- Amplify の URL が決まったら `CORS_ALLOW_ORIGIN` は本番 origin に更新します
- Lambda の zip 再アップロードでは環境変数は消えませんが、変更後は値が意図どおり残っているか再確認すると安全です

開発中は `CORS_ALLOW_ORIGIN=*` でも構いませんが、本番では Amplify の domain に絞るほうが安全です。

### 6-6. IAM 権限を付与する

1. Lambda の `設定 -> アクセス権限` を開きます
2. `実行ロール` のロール名リンクを押します
3. IAM ロール画面で `許可を追加`
4. `インラインポリシーを作成`
5. `JSON` タブに切り替えて、次のポリシーを貼ります
6. `ポリシーを作成` します

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RdsDataApiAccess",
      "Effect": "Allow",
      "Action": [
        "rds-data:BatchExecuteStatement",
        "rds-data:BeginTransaction",
        "rds-data:CommitTransaction",
        "rds-data:ExecuteStatement",
        "rds-data:RollbackTransaction"
      ],
      "Resource": "<DATABASE_ARN>"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "<DATABASE_SECRET_ARN>"
    }
  ]
}
```

デフォルトロールには通常、CloudWatch Logs への出力権限は最初から付いています。

### 6-7. テスト実行

API Gateway に進む前に、まず Lambda 単体で `GET /health` を通します。

1. Lambda の `テスト` タブを開きます
2. `新しいイベントを作成`
3. イベント名を `health-test` にします
4. イベント JSON に次を貼ります

```json
{
  "version": "2.0",
  "routeKey": "GET /health",
  "rawPath": "/health",
  "rawQueryString": "",
  "headers": {},
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/health"
    }
  },
  "isBase64Encoded": false
}
```

5. `保存`
6. `テスト`

期待結果:

- `statusCode: 200`
- body に `{"data":{"status":"ok","service":"reflect-journal-backend"}}`

このテストが通れば、少なくとも次が正しいと判断できます。

- zip アップロード
- Handler 設定
- Lambda 実行
- CORS ヘッダー生成

ここまで通ったら API Gateway 構築に進みます。

## 7. API Gateway HTTP API を作る

### 7-1. API を作る

1. AWS コンソールで `API Gateway` を開く
2. `HTTP API` の `Build`
3. API 設定画面で次を入れます

設定:

- API name: `reflect-journal-prod-http-api`
- IP アドレスのタイプ: `IPv4`

### 7-2. Lambda integration を追加する

API 作成ウィザードの `統合を追加` で、先ほど作成した Lambda:

- `reflect-journal-prod-api`

を選びます。

補足:

- この画面では Lambda 統合が 1 つ入ったら十分です
- 追加し終わったら `次へ` で進みます

### 7-3. まず `GET /health` を作る

API 作成ウィザードの route 設定では、まず次の 1 本だけ作ります。

- Method: `GET`
- Path: `/health`
- Integration target: `reflect-journal-prod-api`

理由:

- 先に API Gateway までの疎通だけ確認したい
- いきなり認証付き route まで全部入れると切り分けが重くなる

### 7-4. stage を設定する

ウィザードでは次で構いません。

- Stage name: `$default`
- Auto-deploy: `オン`

作成後に発行される invoke URL をメモします。

例:

```text
https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
```

### 7-5. まず `/health` を確認する

ブラウザまたは curl で:

```bash
curl https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/health
```

期待値:

- 200
- `{ "data": { "status": "ok", "service": "reflect-journal-backend" } }`

ここが通れば、少なくとも次が成立しています。

- API Gateway HTTP API
- Lambda integration
- route `GET /health`
- `$default` stage

### 7-6. JWT authorizer を作る

API 作成後、`認可` / `Authorization` から `JWT authorizer` を追加します。

必要な値:

- Issuer URL:
  `https://cognito-idp.ap-northeast-1.amazonaws.com/<USER_POOL_ID>`
- Audience:
  `<COGNITO_APP_CLIENT_ID>`

authorizer 名の例:

- `cognito-jwt`

### 7-7. `GET /bootstrap` を追加して JWT authorizer を付ける

次に route を追加します。

- Method: `GET`
- Path: `/bootstrap`
- Integration target: `reflect-journal-prod-api`

作成後、`GET /bootstrap` の `認可` に `cognito-jwt` を設定します。

注意:

- 最初に authorizer を `GET /health` 側から作ると、`/health` にも認可が付いたままになりやすいです
- `GET /health` は最後まで `なし`
- `GET /bootstrap` は `cognito-jwt`

### 7-8. 残りの route を追加する

最終的に追加する route:

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

- `GET /health` は認可なし
- それ以外は `cognito-jwt`

## 8. API の疎通確認

### 8-1. まず health を確認する

ブラウザまたは curl で:

```bash
curl https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/health
```

期待値:

- 200
- `{ "data": { "status": "ok", "service": "reflect-journal-backend" } }`

### 8-2. `bootstrap` をトークンなしで確認する

ブラウザで:

```text
https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/bootstrap
```

期待値:

- `401 Unauthorized`

これで JWT authorizer が効いていることを確認できます。

### 8-3. 認証付き API を確認する

次は Cognito でログインし、`access token` を使って `/bootstrap` を呼びます。

手動確認では、App Client で一時的に `Implicit grant` を有効にすると確認が楽です。

確認手順:

1. Cognito App Client の `ログインページ` 設定を編集
2. `OAuth 付与タイプ` に `Implicit grant` を一時的に追加
3. 次の URL でログインする

```text
https://<cognito-domain>/login?client_id=<COGNITO_APP_CLIENT_ID>&response_type=token&scope=openid+email&redirect_uri=http://localhost:3000
```

4. ログイン後、URL の `#access_token=...` を控える

補足:

- `response_type=code` だと認可コードが返るだけで、そのまま API には使えません
- 手動確認に使うのは `access_token` です
- `id_token` ではありません

access token が取得できたら:

```bash
curl \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com/bootstrap
```

期待値:

- 200
- `{ data: { days: [], weeklySummaries: [], monthlySummaries: [], yearlySummaries: [] } }`

確認後は、Cognito App Client の `Implicit grant` を無効に戻します。

### 8-4. エラーが出たときの見る場所

順番:

1. API Gateway の route 設定
2. JWT authorizer の issuer / audience
3. Lambda の CloudWatch Logs
4. Lambda 環境変数
5. Aurora ARN / Secret ARN
6. Data API が有効か

### 8-5. 認証と CORS の切り分け方

frontend から API を叩いたときは、次の順番で見ます。

- `OPTIONS /bootstrap = 404`
  - 認証以前に API Gateway の CORS 設定が足りていません
- `OPTIONS /bootstrap = 204`
  - CORS は通っています
- その後の `GET /bootstrap = 401`
  - 未認証としては期待どおりです
- その後の `GET /bootstrap = 200`
  - token 付き認証が通っています

`Failed to fetch` とだけ出る場合でも、実際には `Network` タブで `OPTIONS` と `GET` を分けて見ると原因を切り分けやすくなります。

## 9. Amplify Hosting を作る

### 9-1. GitHub 連携

1. AWS コンソールで `Amplify` を開く
2. `アプリケーションをデプロイ`
3. GitHub repository を接続
4. リポジトリ `reflect-journal` を選ぶ
5. ブランチ `main` を選ぶ

補足:

- Amplify に `main` ブランチを接続すると、今後 `main` への push で自動 build / deploy が走ります
- 個人開発で一気に本番反映するならこのままで構いません
- 試作だけ別で確認したいときは、あとから `新しいブランチを接続` で検証用 branch を追加できます

### 9-2. build 設定

frontend は Vite なので、通常は Amplify が自動検出できます。

必要なら build settings で以下に近い設定にします。

- install: `npm ci`
- build: `npm run build`
- artifact: `dist`

今回の構成では、次の値で動作確認できています。

- frontend build command: `npm run build`
- output directory: `dist`
- SSR: オフ

### 9-3. frontend の環境変数

Amplify 側で最低限必要になる値:

- `VITE_API_BASE_URL=<API Gateway invoke URL>`
- `VITE_REPOSITORY_DRIVER=api`

frontend に Cognito 認証ガードを入れる場合は、さらに以下も追加します。

- `VITE_COGNITO_APP_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`

例:

```text
VITE_API_BASE_URL=https://<API_ID>.execute-api.ap-northeast-1.amazonaws.com
VITE_REPOSITORY_DRIVER=api
VITE_COGNITO_APP_CLIENT_ID=<COGNITO_APP_CLIENT_ID>
VITE_COGNITO_DOMAIN=https://<COGNITO_DOMAIN>
```

### 9-4. デプロイ後に最初に確認すること

Amplify の初回デプロイが終わったら、発行された URL:

```text
https://<AMPLIFY_APP_URL>
```

にアクセスして、frontend の画面自体が開くことを確認します。

この時点では、まだ Cognito の callback / sign-out URL や API Gateway CORS を本番 URL に合わせていない場合があります。

その場合:

- 画面は出る
- ただし API 呼び出しは `Failed to fetch` になる

ことがあります。これは Amplify 配信の失敗ではなく、認証または CORS 設定が未完了なだけです。

### 9-5. Cognito に Amplify URL を追加する

Amplify URL が確定したら、Cognito App Client の `ログインページ` 設定を編集し、次を追加します。

- 許可されているコールバック URL:
  - `https://<AMPLIFY_APP_URL>`
- 許可されているサインアウト URL:
  - `https://<AMPLIFY_APP_URL>`

ローカル開発用の `http://localhost:3000` は残して構いません。

### 9-6. Lambda の `CORS_ALLOW_ORIGIN` を Amplify URL に合わせる

Lambda `reflect-journal-prod-api` の `設定 -> 環境変数` で、次の値を更新します。

```text
CORS_ALLOW_ORIGIN=https://<AMPLIFY_APP_URL>
```

ローカル開発だけの間は `http://localhost:3000` でも構いませんが、Amplify 上で動かすときは Amplify の origin に合わせる必要があります。

### 9-7. API Gateway の CORS も有効化する

Amplify 上の frontend から API Gateway を呼ぶと、ブラウザは先に `OPTIONS` リクエストを送ることがあります。これを **preflight request** と呼びます。

もし API Gateway 側で CORS を設定していないと、次のような症状になります。

- `OPTIONS /bootstrap` が `404`
- 画面上では `Failed to fetch`
- 認証以前にブラウザが通信を止める

この場合は API Gateway `reflect-journal-prod-http-api` の `CORS` 設定で次を有効にします。

- `Access-Control-Allow-Origin`
  - `https://<AMPLIFY_APP_URL>`
- `Access-Control-Allow-Methods`
  - `GET,PUT,POST,DELETE,OPTIONS`
- `Access-Control-Allow-Headers`
  - `Content-Type,Authorization`

設定後、ブラウザの Network タブで次を確認します。

- `OPTIONS /bootstrap`
  - `204 No Content`
- `GET /bootstrap`
  - 未認証なら `401 Unauthorized`

ここまで確認できれば、CORS は解消済みです。

## 10. frontend の Cognito 連携

### 10-1. 何を実装するか

frontend は、静的ファイル自体を Cognito で配信ブロックするのではなく、**アプリ起動直後に認証状態を確認し、未認証ならカレンダー描画前に Hosted UI へリダイレクトする**方式で実装します。

対象ファイル:

- `src/auth/AuthContext.tsx`
- `src/auth/authSession.ts`
- `src/App.tsx`
- `src/components/AuthStatus.tsx`

### 10-2. 実装方針

このリポジトリでは次の方針を取ります。

- `authorization code flow + PKCE`
- token は frontend で交換する
- access token を API リクエストの `Authorization: Bearer ...` に付ける
- `VITE_REPOSITORY_DRIVER=api` のときだけ認証を必須にする
- `localStorage` モードでは従来どおり guest 的に動ける

補足:

- 手動確認のために一時的に `Implicit grant` を有効にすることはあります
- ただし本番運用では `authorization code flow + PKCE` に戻します

### 10-3. 起動時の流れ

1. frontend が起動する
2. `VITE_REPOSITORY_DRIVER` が `api` か確認する
3. URL に `?code=...` がある場合
   - Cognito の `/oauth2/token` に code を交換しに行く
4. 既存セッションがある場合
   - access token / refresh token から復元する
5. どちらも無ければ
   - Cognito Hosted UI にリダイレクトする
6. 認証が確立してから `bootstrap()` を呼ぶ

### 10-4. callback URL の扱い

このアプリは `HashRouter` を使っているため、callback URL は origin 単位で扱います。

例:

- ローカル: `http://localhost:3000`
- Amplify: `https://<AMPLIFY_APP_URL>`

`/calendar` のような画面パスは `#` の後ろにあるので、Cognito callback URL には入りません。

### 10-5. 未認証時の期待動作

Amplify 上で未認証のまま開いた場合、最終的には次のようになります。

- `OPTIONS /bootstrap`
  - `204`
- `GET /bootstrap`
  - `401`
- frontend はカレンダーを描画せず
  - 「認証状態を確認しています...」
  - 「ログイン画面に移動しています...」
  のような待機表示を出して Hosted UI に遷移する

つまり、`Failed to fetch` を見せるのではなく、認証が終わるまでアプリ本体を描画しない状態を目指します。

### 10-6. ログアウト

ログアウト時は Cognito の `/logout` エンドポイントにリダイレクトし、終了後は callback と同様に:

- `http://localhost:3000`
- `https://<AMPLIFY_APP_URL>`

のどちらかへ戻します。

### 10-7. ここまで終わったら確認すること

1. Amplify の URL を開く
2. 未認証なら Hosted UI に飛ぶ
3. Hosted UI でログインする
4. frontend に戻る
5. `/bootstrap` が `200`
6. カレンダーが表示され、`Failed to fetch` が出ない
7. `ログアウト` で Cognito logout が動く

### 10-8. 現在の UI / 認証の期待動作

`api` モードでは、未認証時に次の挙動を期待します。

- ヘッダーにユーザー ID の生値は表示しない
- 未認証ならカレンダー本体を描画せず、認証確認またはリダイレクト待ち表示を出す
- 認証確立後に `/bootstrap` を呼び、その後でカレンダーを表示する

`guest mode` のままカレンダーが見えている場合は、古い frontend build が配信されているか、Cognito 環境変数が Amplify に入っていない可能性があります。

## 11. 作成後チェックリスト

全部終わったら、次を確認します。

- `GET /health` が 200
- `OPTIONS /bootstrap` が 204
- 未認証の `GET /bootstrap` が 401
- access token 付き `GET /bootstrap` が 200
- card 作成 API が 200
- day summary 更新 API が 200
- year summary 更新 API が 200
- Aurora にデータが実際に入る
- CloudWatch Logs に致命的エラーが出ていない
- Amplify の frontend から API に接続できる
- 未認証で Amplify を開いたとき、カレンダー描画前に Hosted UI へ遷移する

## 12. よくある詰まりどころ

### 12-1. `/health` は通るが `/bootstrap` が 401

見る場所:

- API Gateway JWT authorizer の issuer
- API Gateway JWT authorizer の audience
- 送っている token が `id token` ではなく `access token` か

### 12-1-1. `/health` まで 401 になる

原因:

- `GET /health` にも JWT authorizer を付けてしまっている

対処:

- API Gateway の route 設定で `GET /health` の認可を `なし` に戻す

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
- API Gateway の `CORS` 設定
- `OPTIONS` preflight が `204` になっているか
- frontend の domain が変わっていないか

典型例:

- `OPTIONS /bootstrap` が `404`
- frontend では `Failed to fetch`

この場合は、認証の問題ではなく API Gateway 側の CORS 設定不足です。

### 12-4. schema 適用後にテーブルが見えない

見る場所:

- 接続先 DB 名
- 適用先 cluster
- 適用した schema が本当に `backend/schema.sql` か

### 12-5. Amplify では guest mode のままで、認証ガードが効かない

見る場所:

- Amplify の最新デプロイが期待した commit を拾っているか
- Amplify の環境変数
  - `VITE_REPOSITORY_DRIVER=api`
  - `VITE_COGNITO_APP_CLIENT_ID`
  - `VITE_COGNITO_DOMAIN`
- ブラウザの hard reload

典型例:

- docs だけ push して frontend 本体を push していない
- `main` には push したが、Amplify がまだ古い build を配信している

### 12-6. カード作成や更新で 500 が出る

Data API では、SQL の型が曖昧だと PostgreSQL 側でエラーになりやすいです。

典型例:

- `UUID` 列に文字列をそのまま入れている
- `DATE` 列と text を比較している
- `TIMESTAMPTZ` 列に text をそのまま入れている

対処例:

- `CAST(:cardId AS UUID)`
- `CAST(:date AS DATE)`
- `CAST(:createdAt AS TIMESTAMPTZ)`
- `CAST(:updatedAt AS TIMESTAMPTZ)`

カード作成時に `500` が出たら、まず CloudWatch Logs またはブラウザの `Response` で PostgreSQL エラー本文を確認します。

### 12-7. 登録済みカードの時刻表示が JST にならない

DB 側は `TIMESTAMPTZ` で保持します。表示がずれるときは、保存時刻そのものよりも API の返し方と frontend 側の整形を確認します。

見る場所:

- backend が `createdAt` / `updatedAt` を ISO 8601 UTC (`...Z`) で返しているか
- frontend が `Asia/Tokyo` で表示整形しているか

### 12-8. favicon の 404

`/favicon.ico` の `404` は、今回の AWS 移行の主要機能とは無関係です。認証や API 動作の調査対象とは切り分けて構いません。

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
11. Cognito callback / sign-out URL に Amplify URL を追加
12. Lambda / API Gateway の CORS を Amplify URL に合わせる
13. frontend の Cognito 対応

## 14. 追加改修時の運用メモ

このリポジトリは、現時点では本番寄り 1 環境で運用しています。

意味:

- `main` へ入れた frontend 変更は Amplify で本番反映される
- backend / API Gateway / Cognito / Aurora は手動反映なので、変更の影響は自分で管理する

追加改修の考え方:

- 本番に入れてよい変更
  - そのまま `main` に反映
- UI の試作や見た目の検証だけ
  - 別ブランチで作業し、必要なら Amplify に検証用ブランチを接続
- backend / DB に影響する変更
  - いまの運用では本番と混ざりやすいので、変更内容を小さく切る

個人開発ではこの運用でも十分ですが、将来 staging を本格的に分けたくなったら、少なくとも次の単位で分離を検討します。

- Amplify
- API Gateway
- Lambda
- Aurora
- Cognito

## 15. 新しいチャットに渡すときの要約テンプレート

新しいチャットで追加改修を依頼するときは、次のような要約を貼ると会話が早くなります。

```text
reflect-journal は AWS 上で次の構成です。
- frontend: Amplify Hosting
- auth: Cognito User Pool + Hosted UI
- API: API Gateway HTTP API + JWT authorizer
- backend: Lambda (zip を手動アップロード)
- DB: Aurora PostgreSQL Serverless v2
- DB access: RDS Data API + Secrets Manager

frontend は main push で Amplify 自動デプロイです。
backend / API Gateway / Cognito / Aurora は手動反映です。

api モードでは Cognito 認証必須で、未認証なら Hosted UI に飛ばします。
GET /health だけ認証なし、他の API は JWT authorizer 付きです。

クレデンシャルや実際の ARN / URL / ID は共有しません。
必要な値はプレースホルダで扱ってください。
```

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
