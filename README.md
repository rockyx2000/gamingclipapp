# GameClips - ゲームクリップ共有アプリ

YouTube のゲームクリップ版を目指す Web アプリケーション。

- 1 分以内のゲームクリップを投稿・共有
- 投稿画面でブラウザ内で編集できる（切り出し・フィルター・テキスト・BGM。元ファイルはアップロードしない）
- サムネイルはクリップの好きなコマか、手持ちの画像から選べる
- PC では YouTube 風の視聴ページ、スマホでは Shorts 風の全画面縦スワイプ視聴（同じ URL）
- いいね・コメント・プレイリスト（公開 / 非公開、並べ替え、連続再生）
- 再生数ランキング（日間 / 週間 / 月間 / 総合）と急上昇フィード
- ゲームカテゴリ検索（26 タイトル、ジャンルで絞り込み）
- ゲームごとのチームメンバー募集掲示板
- ログインなしでも閲覧可能（投稿にはログインが必要）

現在は **バックエンドなしのフロントエンドモック** フェーズ。
データは Next.js の Route Handlers が返すモックデータで、募集・ログインは
サーバーを再起動すると初期状態に戻る。
動画のアップロードは実際に動作し、ファイルと投稿メタデータを `apps/web/data/`
（環境変数 `DATA_DIR` で変更可）に保存する。いいね・コメント・再生記録・プレイリストも
同じディレクトリの `social.json` に保存するので、再起動しても残る。

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) / React 19 / TypeScript |
| UI | Material UI (MUI) v9 |
| モック API | Next.js Route Handlers + インメモリストア |
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

web は `API_URL` が設定されていると、すべての読み書き（ゲーム、クリップ、投稿と動画、
いいね、再生数、コメント、プレイリスト、ランキング、急上昇、募集、ログイン）を api 経由で
行う（compose では設定済み）。`API_URL` を外すと従来のモック API に戻る。
デモログイン（ユーザー名だけで入れる）は、compose では `DEMO_LOGIN=true` で有効にしている。

アップロードした動画は api の `api-data` ボリューム、DB は `db-data` ボリュームに残る。

`docker compose up --build` で web のビルドが `cannot allocate memory` で失敗するときは、
Docker の VM のメモリが足りない（Rancher Desktop の既定は 2GB）。`docker compose stop` で
他のコンテナを止めてからビルドするか、VM のメモリを増やす。

## 開発サーバーの起動

```bash
npm install
npm run dev
```

http://localhost:3000 で起動する。

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

web のアップロード動画はコンテナ内の `/data` に保存されるので、ボリュームをマウントして永続化する。

## 環境変数

| 変数 | 既定値 | 説明 |
|---|---|---|
| `DATA_DIR` | `./data`（Docker では `/data`） | 動画ファイルの保存先。web のモックは `clips.json`、`social.json` もここに置く（api は DB に保存） |
| `MAX_UPLOAD_MB` | `200` | 動画ファイルの上限サイズ（web のモックと api の両方） |
| `MAX_THUMBNAIL_MB` | `10` | サムネイル画像の上限サイズ（同上） |
| `API_URL` | 未設定（モックを使う） | web がゲームの読み取りに使う api の URL。例: `http://localhost:4000` |
| `DATABASE_URL` | `postgres://gameclips:gameclips@localhost:5432/gameclips` | api が使う PostgreSQL の接続先 |
| `PORT` | `4000`（api） | api の待ち受けポート |
| `DEMO_LOGIN` | production では未設定（無効） | `true` でデモログインを有効にする。パスワード検証が無いので本番では使わない |
| `COOKIE_SECURE` | `false` | `true` でセッション Cookie に Secure を付ける（HTTPS で配信するとき） |

`apps/web/.env.example` を `.env.local` にコピーして設定できる。

## ディレクトリ構成

```
apps/web/          Next.js フロントエンド（モック API を含む）
  src/app/         ページと Route Handlers
  src/components/  UI コンポーネント
  src/lib/         モックデータ層・ユーティリティ
apps/api/          Hono + Drizzle + PostgreSQL のバックエンド
  src/db/          スキーマ・マイグレーション実行・シード
  drizzle/         生成されたマイグレーション SQL
packages/shared/   web と api で共有するドメイン型とシードデータ
docker-compose.yml web / api / PostgreSQL をまとめて起動する
docs/              設計ドキュメント（architecture.md）
k8s/               Kubernetes マニフェスト予定地
```

設計の詳細と本物のバックエンドへの移行計画は [docs/architecture.md](docs/architecture.md) を参照。

## デモユーザー

ログインページでデモユーザーを選ぶだけでログインできる（パスワードなしのモック認証）。
