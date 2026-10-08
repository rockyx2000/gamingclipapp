# アーキテクチャ設計

## 概要

GameClips は YouTube のゲームクリップ版を目指す Web アプリケーション。

- 1 分以内のゲームクリップを投稿できる（ショートは独立した機能ではなく、すべてのクリップが 1 つの扱い）
- PC では YouTube 風の視聴ページ、スマホでは Shorts 風の全画面縦スワイプ視聴になる（URL は同じ `/clips/:id`）
- ゲームカテゴリ（ジャンル付き）での検索と、ゲームごとのチームメンバー募集掲示板を持つ
- いいね・コメント・プレイリスト・再生数ランキング・急上昇フィードを持つ
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
- いいね・コメント・再生記録・プレイリストは `DATA_DIR/social.json` に永続化する（後述）

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/healthz` | ヘルスチェック（K8s プローブ用） |
| GET | `/api/clips?game=&q=` | クリップ一覧（フィルタ可） |
| POST | `/api/clips` | クリップ投稿（要ログイン、multipart/form-data、`durationSec` は 60 以下） |
| GET | `/api/media/:clipId/:file` | アップロードした動画・サムネイルの配信（Range 対応） |
| GET | `/api/clips/:id` | クリップ詳細 |
| PUT / DELETE | `/api/clips/:id/like` | いいねする / 外す（要ログイン、冪等。`{ liked, likes }` を返す） |
| POST | `/api/clips/:id/view` | 再生を 1 回記録（ログイン不要、同じ視聴者の 30 分以内の重複は数えない） |
| GET | `/api/clips/:id/comments` | コメント一覧（新しい順） |
| POST | `/api/clips/:id/comments` | コメント投稿（要ログイン、`{ body }`、500 文字以内） |
| DELETE | `/api/clips/:id/comments/:commentId` | コメント削除（書いた本人かクリップの投稿者） |
| GET | `/api/ranking?period=&game=` | 再生数ランキング（`period` は `day` / `week` / `month` / `all`） |
| GET | `/api/trending?game=` | 急上昇 |
| GET | `/api/me/likes` | 自分がいいねしたクリップ（要ログイン） |
| GET | `/api/playlists` | 自分のプレイリスト一覧（要ログイン） |
| POST | `/api/playlists` | 作成（要ログイン。`{ title, description?, visibility?, clipId? }`） |
| GET | `/api/playlists/:id` | 詳細（非公開は持ち主だけ。他人には 404） |
| PATCH | `/api/playlists/:id` | タイトル・説明・公開設定・並び順（`clipIds`）の変更（持ち主のみ） |
| DELETE | `/api/playlists/:id` | 削除（持ち主のみ） |
| POST | `/api/playlists/:id/clips` | `{ clipId }` を末尾に追加（持ち主のみ、追加済みなら何もしない） |
| DELETE | `/api/playlists/:id/clips/:clipId` | プレイリストから外す（持ち主のみ） |
| GET | `/api/games?q=&genre=` | ゲーム一覧・検索（ジャンルで絞り込み可） |
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
- `Game` - ゲームカテゴリ（`genre` は `GAME_GENRES` のいずれか）
- `Clip` - 動画クリップ（`durationSec` は `MAX_CLIP_DURATION_SEC` = 60 以下）。
  API が返す `views` / `likes` は保存値に記録分を足した現在の数
- `Playlist` - プレイリスト（`clipIds` が再生順。`visibility` は `public` / `private`）
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

## いいね・コメント・再生数・ランキング・プレイリスト

すべて `src/lib/mock-db.ts` に実装し、`DATA_DIR/social.json` に保存する。

```
social.json
  likes        [{ clipId, userId, at }]          いいね（誰がいつ）
  viewTotals   { clipId: 記録した再生の累計 }
  viewBuckets  { clipId: { 時間バケット: 再生数 } }  直近 31 日だけ残す
  playlists    [Playlist]
  clipComments { clipId: [{ id, authorId, body, createdAt }] }  投稿順
```

- **書き込み**: 一時ファイルに書いて `rename` する。書き込みは 1 本の Promise チェーンに
  並べ、同時に書いて壊れないようにする。再生は 1 回ごとに書くと重いので 5 秒まとめて保存する
- **再生数**: 視聴ページ（PC）は `VideoPlayer` の再生開始、スマホのフィードは
  表示中のクリップの再生開始で `POST /api/clips/:id/view` を送る（`useRecordView`）。
  ページを開いただけ・プリフェッチでは数えない。視聴者はログインと関係なく
  匿名 ID の Cookie（`gca_viewer`）で区別し、同じ視聴者の 30 分以内の再生は 1 回にまとめる
- **ランキング (`/ranking`)**: 日間・週間・月間は直近 24 時間 / 7 日 / 30 日の
  時間バケットの合計、総合は総再生数で並べる。ゲームで絞り込める
- **急上昇 (`/trending`)**: 直近 48 時間の再生といいねを、12 時間で重みが半分になる
  減衰をかけて合計したスコアで並べる（いいね 1 件 = 再生 5 回ぶん）。
  総再生数が多いだけの古いクリップより、いま伸びているクリップが上に来る
- **シードの再生履歴**: シードクリップには起動時に直近 30 日の再生履歴を生成する
  （クリップ ID から決まる疑似乱数で、一部は直近 2 日に山を置く）。
  ランキングと急上昇の見た目を確かめるためのもので、永続化しない
- **いいね**: 押した瞬間に表示を変え、API が失敗したら戻す（`useLike`）。
  未ログインなら `/login?next=<今の URL>` へ送り、ログイン後に戻ってくる
- **コメント**: PC は説明欄の下、スマホはフィード右側のボタンから下に開くシート
  （`CommentsSheet`）で読み書きする。どちらも `ClipComments` を使い、投稿・削除は
  API の結果で手元の一覧を更新する。投稿者は ID だけ保存し、表示時に `User` を引く。
  削除できるのは書いた本人とクリップの投稿者。`social.json` に `clipComments` が
  無いとき（初回）だけ見本のコメントを入れる
- **プレイリスト**: 視聴ページの「保存」からチェックで追加・削除し、その場で新規作成もできる。
  `/playlists` が一覧（先頭に「高く評価したクリップ」= いいね一覧）、
  `/playlists/:id` が詳細で、持ち主は編集・削除・並べ替えができる。
  非公開のものは持ち主以外には 404 を返し、存在も漏らさない
- **プレイリスト再生**: `/clips/:id?list=<プレイリスト ID>` で開くと、PC は右側に一覧を出し
  最後まで見たら次のクリップへ進む。スマホはプレイリストの順にスワイプする
- **制限事項（PoC）**: 再生数の重複判定はインメモリなので再起動でリセットされる。
  Cookie を消せば数え直せるため、本番では IP やログインユーザーも合わせて判定し、
  集計は DB 側（時間別の集計テーブルなど）に移す

## 動画のアップロードと保存

```
ブラウザ (/upload の 3 フェーズ)             サーバー (Route Handler)
  | [1] 選択: ドロップ、<video> で長さを読み取る |
  | [2] 編集: 範囲・フィルター・テキスト・BGM     |
  |     「この範囲で進む」で mediabunny が書き出す（ブラウザ内、保存なし）
  | [3] 情報: サムネイルとタイトル等を決める      |
  |     コマを JPEG 化、または画像をアップロード  |
  |                                        |
  |-- POST /api/clips (multipart) -------->|  検証（MIME / サイズ / 長さ / ゲーム）
  |   video, thumbnail, title, gameId...   |  storage.put("<id>/video.mp4")
  |   (XHR で進捗表示)                      |  storage.put("<id>/thumb.<ext>")
  |                                        |  addClip() -> clips.json に追記
  |<-- 201 { clip } ----------------------|
  |                                        |
  |-- GET /api/media/<id>/video.mp4 ------>|  storage.read()（Range 対応で 206 を返す）
```

- **投稿画面のフェーズ (`src/app/upload/page.tsx`)**: 「選択 / 編集 / 情報」を 1 つの URL の中で
  切り替える。ルーティングを変えないので、File・編集内容・書き出した Blob を持ち続けられる。
  書き出しは「編集 → 情報」へ進むときに 1 度だけ実行する
- **編集 UI (`src/components/upload/`)**: `Timeline` はフィルムストリップ上の白い枠を
  ドラッグして範囲を決める（枠内で移動、両端で伸縮、横スクロールと拡大縮小に対応）。
  その下にテキストと BGM の帯を並べ、動画編集ソフトと同じ操作感で区間を動かせる。
  ヘッダーの「テキスト追加」「音声追加」からその場で足せる。
  `FilterPanel` は明るさ・コントラスト・彩度とプリセット、`AnnotationPanel` はテキストの
  内容・色・大きさ・表示区間で、位置は `PreviewStage` 上のドラッグで決める。
  `AudioPanel` は元動画の音量と BGM（音量・音源の開始位置・繰り返し）
- タイムラインは左右に `TRACK_PADDING` の余白を持つ。これが無いと、選択範囲が
  動画の端まで伸びているとき（1 分以内の動画では既定でそうなる）につまみが
  スクロール領域の外に出て掴めなくなる
- **編集値の共有 (`src/lib/video-edit.ts`)**: フィルターは CSS 文字列として、テキストは
  canvas への描画関数として定義し、プレビューと書き出しで同じ値を使う。
  BGM のファイルはブラウザ内だけで扱い、サーバーへは送らない（音は動画に混ぜ込む）
- **ブラウザ内の書き出し (`src/lib/video-trim.ts`)**:
  1 時間の動画を選んでも、元ファイルはサーバーへ送らない。mediabunny の `Conversion` に
  `trim` を渡して範囲だけを MP4 に書き出す。入力は `BlobSource` でストリーミング読みなので
  ファイル全体をメモリに載せず、出力（最大 1 分）だけをメモリに持つ。
  フィルターやテキストがあるときは `process` コールバックで 1 フレームずつ canvas に描いて
  焼き込む。加工がなく先頭からの切り出しならパケットコピーで高速。
  出力は最大 1920px 幅に抑える。
  WebCodecs 非対応のブラウザでは 1 分超の動画を受け付けず、1 分以内の動画でも
  切り出しや加工をしようとした時点で書き出しを止める（`canTrimInBrowser`）。
  Safari は `ctx.filter` が無いためフィルターの焼き込みができず、その旨を画面で伝える
  （`canBakeFilters`）
- **音声の合成 (`src/lib/audio-mix.ts`)**: BGM を足す、または元の音量を変えるときは、
  `Conversion` を `composable: true` にして映像だけ任せ、音声トラックは自分で作って
  出力に足す。元動画の音声は `AudioBufferSink` で切り出す範囲だけを読み、
  BGM は `decodeAudioData` で復号して `OfflineAudioContext` で重ねる。
  つまり読み込むのは最大 1 分ぶんで、1 時間の動画でもメモリは増えない。
  BGM の終わりは 0.4 秒かけて絞り、ぶつ切りを避ける
- **フレーム画像 (`src/lib/video-probe.ts`)**: `FrameCache` が `<video>` のシークで
  タイムラインのフレームを作る。表示中の範囲だけを要求するので、1 時間の動画でも
  必要な分しか生成しない
- **サムネイル**: 書き出したクリップの好きなコマ（スライダーで位置を選ぶ）か、
  手持ちの画像（JPEG / PNG / WebP）のどちらか。どちらも `thumbnail` として同じ
  multipart で送り、サーバーは MIME から拡張子を決めて保存する
- **ストレージ層 (`src/lib/storage.ts`)**: `ClipStorage` インターフェースと
  ローカルディスク実装。キーは `<clipId>/video.<ext>` と `<clipId>/thumb.<ext>`
- **設定 (`src/lib/config.ts`)**: `DATA_DIR`、`MAX_UPLOAD_MB`、`MAX_THUMBNAIL_MB` を
  環境変数から読む
- **制限事項（PoC）**:
  - `request.formData()` はファイル全体をメモリに載せるため、巨大ファイルには向かない
  - 動画の長さはブラウザが読み取った値を信用している（サーバー側の ffprobe 検証は未実装）
  - 書き出しの再エンコードはブラウザの性能に依存する。長い範囲やテキスト付きは時間がかかる
  - フィルターとテキストは映像に焼き込むため、投稿後に外せない
  - サムネイル生成はブラウザ側なので、生成できない環境ではプレースホルダー画像になる
  - BGM は AAC でエンコードするため、WebCodecs の音声エンコードが無いブラウザでは
    追加できない（`canAddBgm` で判定し、ボタンを無効にする）
  - BGM に使う音源の権利は投稿者の責任。サービス側の権利処理は未実装
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

### 進捗

- **済**: `packages/shared`（ドメイン型とシードデータ）、`apps/api` の土台
  （Hono / Drizzle / PostgreSQL、マイグレーション、シード、`docker-compose.yml`）、
  読み取り API（`GET /api/games`、`/api/games/:slug`、`/api/clips`、`/api/clips/:id`）、
  プローブ（`/api/healthz` は DB に触らない、`/api/readyz` は DB 接続まで見る）
- **未**: 認証、いいね・再生数・コメント・プレイリスト・募集、動画アップロード。
  `apps/web` はまだモック API を使っており、api は呼んでいない
- **api と web のモックの差**: api の `commentCount` は、コメントを移すまで常に 0 を返す。
  `views` / `likes` はシードの初期値のままで、いいね・再生の記録を移したらその集計を足す

### 構成

- `packages/shared` は TypeScript のソースのまま配布する（ビルドしない）。
  `@gamingclipapp/shared` は型だけ（クライアントコンポーネントからも読むため）、
  シードは `@gamingclipapp/shared/seed` に分けてあり、web のモックストアと api のシードが共用する
- api は tsup で依存ごと 1 つのバンドルにする。実行イメージに `node_modules` は要らない
- 返す JSON の形（`{ games }` / `{ game }` / `{ clips }` / `{ clip }` / `{ error }`）は
  web のモック API と揃えてあるので、`mock-db.ts` を fetch に差し替えるときに形を変えなくて済む
- 並び順はシードの並び（`games.sort_order`）、クリップは新しい順

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
