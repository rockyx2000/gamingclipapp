# GameClips - ゲームクリップ共有アプリ

YouTube のゲームクリップ版を目指す Web アプリケーション。

- 最大 2 分のゲームクリップ + 15 秒程度のショート動画
- ゲームカテゴリ検索
- ゲームごとのチームメンバー募集掲示板
- ログインなしでも閲覧可能（投稿にはログインが必要）

現在は **バックエンドなしのフロントエンドモック** フェーズ。
データは Next.js の Route Handlers が返すインメモリのモックデータで、
サーバーを再起動すると初期状態に戻る。

## 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) / React 19 / TypeScript |
| UI | Material UI (MUI) v9 |
| モック API | Next.js Route Handlers + インメモリストア |
| 構成 | npm workspaces モノレポ |

## 必要環境

- Node.js 22 以上

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

## Docker

```bash
docker build -f apps/web/Dockerfile -t gamingclipapp-web:dev .
docker run --rm -p 3000:3000 gamingclipapp-web:dev
```

## ディレクトリ構成

```
apps/web/          Next.js フロントエンド（モック API を含む）
  src/app/         ページと Route Handlers
  src/components/  UI コンポーネント
  src/lib/         型定義・モックデータ層・ユーティリティ
docs/              設計ドキュメント（architecture.md）
k8s/               Kubernetes マニフェスト予定地
```

設計の詳細と本物のバックエンドへの移行計画は [docs/architecture.md](docs/architecture.md) を参照。

## デモユーザー

ログインページでデモユーザーを選ぶだけでログインできる（パスワードなしのモック認証）。
