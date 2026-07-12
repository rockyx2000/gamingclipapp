# アーキテクチャ設計

## 概要

GameClips は YouTube のゲームクリップ版を目指す Web アプリケーション。

- 最大 2 分のゲームクリップと、15 秒程度のショート動画を投稿できる
- ゲームカテゴリでの検索と、ゲームごとのチームメンバー募集掲示板を持つ
- アカウント機能を持つが、未ログインでも閲覧は可能

## 現在のフェーズ: フロントエンドモック (PoC)

```
+--------------------------------------------------+
| apps/web (Next.js 16 / App Router / MUI v9)      |
|                                                  |
|  ページ (Server Components)                       |
|      |            \                              |
|      v             v                             |
|  src/lib/mock-db.ts   <--  /api/* Route Handlers |
|  (インメモリストア)          (モック API)            |
+--------------------------------------------------+
```

- **`src/lib/mock-db.ts`** がデータアクセス層。サーバーコンポーネントと
  Route Handlers の両方がこの層を経由する
- **`/api/*` Route Handlers** は本物のバックエンドと同じ形の REST API を提供する。
  クライアントコンポーネント（フォーム、ログイン等）はここへ fetch する
- 認証は httpOnly Cookie にセッション ID を保存する簡易モック
- データはインメモリのためサーバー再起動で初期化される（モックとして許容）

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/healthz` | ヘルスチェック（K8s プローブ用） |
| GET | `/api/clips?game=&type=&q=` | クリップ一覧（フィルタ可） |
| POST | `/api/clips` | クリップ投稿（要ログイン） |
| GET | `/api/clips/:id` | クリップ詳細 |
| GET | `/api/games?q=` | ゲーム一覧・検索 |
| GET | `/api/games/:slug` | ゲーム詳細 |
| GET | `/api/recruits?game=` | 募集一覧 |
| POST | `/api/recruits` | 募集投稿（要ログイン） |
| GET | `/api/recruits/:id` | 募集詳細 |
| POST | `/api/recruits/:id/comments` | コメント投稿（要ログイン） |
| GET | `/api/users` | デモユーザー一覧 |
| POST | `/api/auth/login` | モックログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 現在のユーザー |

## データモデル

`src/lib/types.ts` を参照。主要エンティティ:

- `User` - ユーザー
- `Game` - ゲームカテゴリ
- `Clip` - 動画クリップ（`type: "clip" | "short"`、clip は最大 120 秒）
- `RecruitPost` - メンバー募集投稿（`Comment` の配列を持つ）

## 次フェーズ: 本物のバックエンド (apps/api)

TypeScript 製のバックエンドを `apps/api` に追加する。

- 候補: Hono（軽量・Cloudflare Workers 互換）または NestJS（学習コスト高いが本格的）
- 移行手順:
  1. `packages/shared` を作り `types.ts` を移動、web / api の両方から参照する
  2. `apps/api` に同じ REST API を実装（DB は PostgreSQL を想定）
  3. `apps/web` の `src/lib/mock-db.ts` の関数実装を、`apps/api` への
     fetch に差し替える（関数シグネチャは維持する）
  4. `/api/*` Route Handlers は削除するか、apps/api へのプロキシにする
- 動画ファイルは オブジェクトストレージ（自宅 K8s なら MinIO、
  Cloudflare なら R2）に保存し、アップロードは署名付き URL 方式にする
- 認証は本物のセッション管理（または NextAuth / Auth.js）に置き換える

## インフラの段階的な計画

1. **PoC（現在）**: ローカルで `npm run dev`
2. **自宅 Kubernetes**:
   - `apps/web/Dockerfile` でイメージをビルドし、レジストリへ push
   - `k8s/` にマニフェストを置く（Deployment / Service / Ingress）
   - `/api/healthz` を liveness / readiness プローブに使う
   - コンテナは非 root ユーザー（uid 1001）で動作する
   - 設定は環境変数で注入する（`NEXT_PUBLIC_*` はビルド時に埋め込まれる点に注意）
3. **Cloudflare Workers（検討中）**:
   - Next.js は `@opennextjs/cloudflare` でのデプロイを検討
   - バックエンドを Hono にしておくと Workers への移植が容易
   - 動画配信は R2 + Cloudflare Stream が候補

## 運用上の考慮（モック段階から組み込み済み）

- `output: "standalone"` による軽量な本番イメージ
- マルチステージ Dockerfile、非 root 実行
- `/api/healthz` ヘルスチェックエンドポイント
- モノレポ構成（`npm workspaces`）でバックエンド追加に備える
