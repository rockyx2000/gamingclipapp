# GameClips - ゲームクリップ共有アプリ

YouTube のゲームクリップ版を目指す Web アプリケーション。

- 1 分以内のゲームクリップを投稿・共有
- 投稿画面でブラウザ内で編集できる（切り出し・フィルター・テキスト・BGM。元ファイルはアップロードしない）
- サムネイルはクリップの好きなコマか、手持ちの画像から選べる
- PC では YouTube 風の視聴ページ、スマホでは Shorts 風の全画面縦スワイプ視聴（同じ URL）
- いいね・コメント（`@` でユーザーを呼べる、非同期に読み込み）・プレイリスト（公開 / 非公開、並べ替え、連続再生）
- 再生数ランキング（日間 / 週間 / 月間 / 総合）と急上昇フィード
- ゲームカテゴリ検索（26 タイトル、ジャンルで絞り込み）と、ヘッダーの検索サジェスト
- サムネイルにマウスを乗せると、動画の最初の 5 秒を再生
- 映像の上にユーザーをタグ付け（Instagram のように、位置を指定して付ける）
- 投稿後の編集（タイトル・説明・ゲーム・サムネイル・タグ）と削除
- ゲームごとのチームメンバー募集掲示板
- ログインなしでも閲覧可能（投稿にはログインが必要）

データは apps/api（Hono + PostgreSQL）が持ち、web は api を呼ぶ。
動画のアップロードも api が受けて、ファイルを保存先（`DATA_DIR`、本番では R2 を想定）に置く。

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) / React 19 / TypeScript |
| UI | Material UI (MUI) v9 |
| バックエンド | Hono / Drizzle ORM / PostgreSQL（apps/api） |
| 動画の編集・書き出し | mediabunny（WebCodecs、ブラウザ内） |
| 構成 | npm workspaces モノレポ |

## 必要環境

- Docker（`docker compose` で動かす場合は、これだけあればよい）
- Node.js 22 以上（ホストで直接動かす場合。`.nvmrc` あり）

## Docker で一式を動かす

web・api・PostgreSQL を 1 コマンドで起動する。Node.js のインストールは要らない。

```bash
docker compose up --build
```

| サービス | URL |
|---|---|
| web | http://localhost:3000 |
| api | http://localhost:4000/api/healthz |

api は起動のたびにマイグレーションとシード（何度流しても重複しない）を済ませてから待ち受ける。
止めるときは `docker compose down`、DB とアップロード動画ごと消すときは `docker compose down -v`。
コードを変えたら `docker compose up --build` で作り直す（ホットリロードは無い。
開発中はホストで下の `npm run dev` を使うと速い）。

web のデータの読み書き（ゲーム、クリップ、投稿と動画、いいね、再生数、コメント、プレイリスト、
ランキング、急上昇、募集、ログイン）は、すべて `API_URL` の api を経由する。ブラウザから見える
`/api/...` は、web が api へ転送している（`/api/healthz` だけは web 自身が返す）。
デモログイン（ユーザー名だけで入れる）は、compose では `DEMO_LOGIN=true` で有効にしている。

アップロードした動画は api の `api-data` ボリューム、DB は `db-data` ボリュームに残る。

`docker compose up --build` で web のビルドが `cannot allocate memory` で失敗するときは、
Docker の VM のメモリが足りない（Rancher Desktop の既定は 2GB）。`docker compose stop` で
他のコンテナを止めてからビルドするか、VM のメモリを増やす。

## 開発サーバーの起動

web は api が無いと動かない。api と DB だけ Docker で立てて、web をホストで動かすとホットリロードが効く。

```bash
docker compose up -d db api   # api は http://localhost:4000
npm install
npm run dev                   # web は http://localhost:3000（API_URL の既定は http://localhost:4000）
```

## その他のコマンド

```bash
npm run build   # 本番ビルド（standalone 出力）
npm run start   # 本番ビルドの起動
npm run lint    # ESLint
```

## イメージを個別にビルドする

```bash
docker build -f apps/web/Dockerfile -t gamingclipapp-web:dev .
docker build -f apps/api/Dockerfile -t gamingclipapp-api:dev .
```

アップロード動画は api のコンテナ内の `/data` に保存されるので、ボリュームをマウントして永続化する。
web は状態を持たない。

## 環境変数

| 変数 | 既定値 | 説明 |
|---|---|---|
| `API_URL` | `http://localhost:4000`（web） | web が使う api の URL。compose では `http://api:4000` |
| `DATA_DIR` | `./data`（api。Docker では `/data`） | api が動画ファイルを保存するディレクトリ |
| `MAX_UPLOAD_MB` | `200`（api） | 動画ファイルの上限サイズ |
| `MAX_THUMBNAIL_MB` | `10`（api） | サムネイル画像の上限サイズ |
| `DATABASE_URL` | `postgres://gameclips:gameclips@localhost:5432/gameclips` | api が使う PostgreSQL の接続先 |
| `PORT` | `4000`（api） | api の待ち受けポート |
| `DEMO_LOGIN` | production では未設定（無効） | `true` でデモログインを有効にする。パスワード検証が無いので本番では使わない |
| `COOKIE_SECURE` | `false` | `true` でセッション Cookie に Secure を付ける（HTTPS で配信するとき） |

`apps/web/.env.example` を `.env.local` にコピーして設定できる。

## ディレクトリ構成

```
apps/web/          Next.js フロントエンド
  src/app/         ページ。/api/... は api への転送（Route Handler）
  src/components/  UI コンポーネント
  src/lib/         api クライアント・ブラウザ内の動画編集・ユーティリティ
apps/api/          Hono + Drizzle + PostgreSQL のバックエンド
  src/db/          スキーマ・マイグレーション実行・シード
  drizzle/         生成されたマイグレーション SQL
  seed-media/      シードのクリップの動画（開発用に生成した短い MP4）
packages/shared/   web と api で共有するドメイン型（シードデータは api が使う）
docker-compose.yml web / api / PostgreSQL をまとめて起動する
docs/              設計ドキュメント（architecture.md）
k8s/               Kubernetes マニフェスト予定地
```

設計の詳細と今後の移行計画は [docs/architecture.md](docs/architecture.md) を参照。

## デモユーザー

ログインページでデモユーザーを選ぶだけでログインできる（パスワードなしのデモ認証。本物の認証へは k8s 移行時に置き換える予定）。
