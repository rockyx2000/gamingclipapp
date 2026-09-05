# アーキテクチャ設計

## 概要

GameClips は YouTube のゲームクリップ版を目指す Web アプリケーション。

- 1 分以内のゲームクリップを投稿できる（ショートは独立した機能ではなく、すべてのクリップが 1 つの扱い）
- PC では YouTube 風の視聴ページ、スマホでは Shorts 風の全画面縦スワイプ視聴になる（URL は同じ `/clips/:id`）
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
- 募集・セッションはインメモリのためサーバー再起動で初期化される（モックとして許容）
- 動画のアップロードは実装済み。ファイルは **`src/lib/storage.ts`**（ストレージ層）経由で
  `DATA_DIR/uploads/` に保存し、投稿メタデータは `DATA_DIR/clips.json` に永続化する

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/healthz` | ヘルスチェック（K8s プローブ用） |
| GET | `/api/clips?game=&q=` | クリップ一覧（フィルタ可） |
| POST | `/api/clips` | クリップ投稿（要ログイン、multipart/form-data、`durationSec` は 60 以下） |
| GET | `/api/media/:clipId/:file` | アップロードした動画・サムネイルの配信（Range 対応） |
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
- `Clip` - 動画クリップ（`durationSec` は `MAX_CLIP_DURATION_SEC` = 60 以下）
- `RecruitPost` - メンバー募集投稿（`Comment` の配列を持つ）

## 視聴ページのレスポンシブ切り替え

`/clips/[id]` は 1 つのサーバーコンポーネントで両方のレイアウトを返す。

- PC 用レイアウトは `display: { xs: "none", md: "flex" }` で SSR され、
  プレイヤー (`WatchVideo`) は md 以上のときだけ自動再生する
- スマホ用の `MobileClipFeed` は `useMediaQuery` で md 未満のときだけマウントされ、
  `position: fixed` で AppShell の上に全画面表示する
  - フィード順は「開いたクリップ → 同じゲーム → 他のゲーム」
  - スクロールスナップ + IntersectionObserver で表示中のクリップだけ再生する
  - 切り替わるたびに `history.replaceState` で URL を `/clips/<id>` に更新する
- 判定は画面幅ベース（User-Agent ではない）なので、ブラウザの幅を狭めるだけで
  スマホ表示を確認できる

## 動画のアップロードと保存

```
ブラウザ                              サーバー (Route Handler)
  |  ファイル選択                           |
  |  - <video> で長さを読み取り 60 秒以内か検証 |
  |  - canvas で 1 秒目のフレームを JPEG 化   |
  |                                        |
  |-- POST /api/clips (multipart) -------->|  検証（MIME / サイズ / 長さ / ゲーム）
  |   video, thumbnail, title, gameId...   |  storage.put("<id>/video.mp4")
  |   (XHR で進捗表示)                      |  storage.put("<id>/thumb.jpg")
  |                                        |  addClip() -> clips.json に追記
  |<-- 201 { clip } ----------------------|
  |                                        |
  |-- GET /api/media/<id>/video.mp4 ------>|  storage.read()（Range 対応で 206 を返す）
```

- **ストレージ層 (`src/lib/storage.ts`)**: `ClipStorage` インターフェースと
  ローカルディスク実装。キーは `<clipId>/video.<ext>` と `<clipId>/thumb.jpg`
- **設定 (`src/lib/config.ts`)**: `DATA_DIR`、`MAX_UPLOAD_MB` を環境変数から読む
- **制限事項（PoC）**:
  - `request.formData()` はファイル全体をメモリに載せるため、巨大ファイルには向かない
  - 動画の長さはブラウザが読み取った値を信用している（サーバー側の ffprobe 検証は未実装）
  - サムネイル生成はブラウザ側なので、生成できない環境ではプレースホルダー画像になる
  - ローカルディスク保存のため、K8s では Pod を 1 つにするか RWX ボリュームが必要
- **ダウンロード抑止**: プレイヤーは自前コントロール（`VideoPlayer`）でブラウザ標準の
  ダウンロードボタンを出さず、右クリック・ピクチャインピクチャも無効化している。
  ただし `/api/media` の URL を知っていれば取得できるため、本気で防ぐには
  短命の署名付き URL や DRM が必要（現段階では UI 上の抑止にとどめる）
- **移行方針**: MinIO / R2 用の `ClipStorage` 実装を追加し、アップロードは
  署名付き URL でブラウザから直接オブジェクトストレージへ送る方式にする。
  配信は `/api/media` ではなくストレージの公開 URL / CDN を使う

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
  （`ClipStorage` の実装を追加して差し替える）
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

## デザイントークン

`src/theme.ts` に集約している。

- 色: 背景 `#15171b` / 面 `#1d2026` / 浮いた面 `#262a31` / 文字 `#f2f3f5`・`#9aa0a8`。
  アクセントは金 `#f2b705` の 1 色だけで、投稿ボタン・現在地のナビ・募集中バッジ・
  フォーカスに限って使う。色はサムネイルと動画が持ってくる前提で UI は無彩色に保つ
- 書体: 日本語は Noto Sans JP。再生時間・件数・ロゴなど数字と欧文だけ Barlow Condensed
  （`displaySx`）。日本語に表示書体を混ぜない
- 角丸: 4px 基準、タグは 2px。動画の四隅を欠かさないため、プレイヤーは外枠だけ角丸にする
- フォントは現在 Google Fonts をブラウザから読み込んでいる（ビルドをネットワーク非依存に
  するため `next/font` は使っていない）。本番では woff2 を `public/fonts` に置いて
  自前配信に切り替える

## 運用上の考慮（モック段階から組み込み済み）

- `output: "standalone"` による軽量な本番イメージ
- マルチステージ Dockerfile、非 root 実行
- `/api/healthz` ヘルスチェックエンドポイント
- モノレポ構成（`npm workspaces`）でバックエンド追加に備える
