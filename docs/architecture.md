# アーキテクチャ設計

## 概要

GameClips は YouTube のゲームクリップ版を目指す Web アプリケーション。

- 1 分以内のゲームクリップを投稿できる（ショートは独立した機能ではなく、すべてのクリップが 1 つの扱い）
- PC では YouTube 風の視聴ページ、スマホでは Shorts 風の全画面縦スワイプ視聴になる（URL は同じ `/clips/:id`）
- ゲームカテゴリ（ジャンル付き）での検索と、ゲームごとのチームメンバー募集掲示板を持つ
- いいね・コメント・プレイリスト・再生数ランキング・急上昇フィードを持つ
- アカウント機能を持つが、未ログインでも閲覧は可能

## 現在の構成

```
ブラウザ ──> apps/web (Next.js 16 / App Router / MUI v9) ──> apps/api (Hono) ──> PostgreSQL
              ページ (Server Components)  ── api クライアント ──┘      │
              /api/* Route Handler (転送) ─────────────────────────────┤
                                                                      └──> ClipStorage (動画・サムネイル)
```

- **web は状態を持たない**。データの読み書きはすべて apps/api を経由する。複数レプリカにしてよい
- サーバーコンポーネントは `src/lib/games.ts`・`clips.ts`・`recruits.ts`・`auth.ts` の
  api クライアントで読む。リクエストの Cookie（`gca_session`、`gca_viewer`）は api に引き継ぐ
  （`src/lib/api.ts`）。`API_URL` の既定は `http://localhost:4000`
- ブラウザからの `/api/...` は、`src/app/api/[...path]/route.ts` が api へそのまま転送する
  （`/api/healthz` だけは web 自身が返す）。本文とレスポンスをストリームのまま流し、
  ステータスと Set-Cookie も引き継ぐので、動画のアップロードや Range 付きの配信も通る。
  ブラウザは web の URL だけを見ればよく、Cookie も同じオリジンのまま使える
- 認証は httpOnly Cookie（`gca_session`）のセッションで、`sessions` テーブルで引く。
  **デモログイン（ユーザー名だけ）で、本物の認証ではない**。`production` では `DEMO_LOGIN=true` を
  明示したときだけ有効。k8s へ移すときに、Cloudflare 経由の Google OAuth に置き換える予定
- `docker compose up --build` で web / api / PostgreSQL が揃う（README 参照）

## API 一覧

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/healthz` | ヘルスチェック（K8s プローブ用） |
| GET | `/api/clips?game=&q=` | クリップ一覧（フィルタ可） |
| POST | `/api/clips` | クリップ投稿（要ログイン、multipart/form-data、`durationSec` は 60 以下、`tags` は `[{ username, x, y }]` の JSON 配列） |
| GET | `/api/media/:clipId/:file` | アップロードした動画・サムネイルの配信（Range 対応） |
| GET | `/api/clips/:id` | クリップ詳細 |
| PUT / DELETE | `/api/clips/:id/like` | いいねする / 外す（要ログイン、冪等。`{ liked, likes }` を返す） |
| POST | `/api/clips/:id/view` | 再生を 1 回記録（ログイン不要、同じ視聴者の 30 分以内の重複は数えない） |
| GET | `/api/clips/:id/comments?limit=&cursor=` | コメント一覧（新しい順、20 件ずつ。`{ comments, nextCursor }`） |
| POST | `/api/clips/:id/comments` | コメント投稿（要ログイン、`{ body }`、500 文字以内。本文の `@ユーザー名` は `mentions` に解決して返す） |
| PUT | `/api/clips/:id/tags` | 映像の上のタグを入れ替える（投稿者だけ、`{ tags: [{ username, x, y }] }`） |
| DELETE | `/api/clips/:id/tags/:userId` | タグを外す（投稿者か、タグ付けされた本人） |
| GET | `/api/search/suggest?q=` | 検索サジェスト（`{ games, clips }`、各 5 件） |
| GET | `/api/users/search?q=` | ユーザー検索（`@` メンション・タグ付けの候補。要ログイン） |
| GET | `/api/recruits/:id/comments?limit=&cursor=` | 募集のコメント一覧（クリップと同じ形） |
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
| POST | `/api/auth/login` | デモログイン（ユーザー名のみ） |
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

すべて apps/api が PostgreSQL に保存する（`apps/api/src/db/schema.ts`）。

```
clip_likes          (clip_id, user_id, liked_at)             いいね（誰がいつ）
clip_views_hourly   (clip_id, hour, seeded, count)           時間別の再生数。seeded = 開発用シードの見せかけ
clip_view_dedupe    (viewer_key, clip_id, last_at)           再生の重複判定
clip_comments       (id, clip_id, author_id, body, created_at)
playlists / playlist_clips (position で再生順)
```

- **書き込み**: 計算は api 側（`social-writes.ts`、`playlists.ts`）。クリップの
  `views` / `likes` は、シードの初期値に記録分を足した数を読み取り時に計算して返す
- **再生数**: 視聴ページ（PC）は `VideoPlayer` の再生開始、スマホのフィードは
  表示中のクリップの再生開始で `POST /api/clips/:id/view` を送る（`useRecordView`）。
  ページを開いただけ・プリフェッチでは数えない。視聴者はログインと関係なく
  匿名 ID の Cookie（`gca_viewer`）で区別し、同じ視聴者の 30 分以内の再生は 1 回にまとめる。
  重複判定は `clip_view_dedupe` への `INSERT ... ON CONFLICT` 1 回で行うので、api を
  複数動かしても、同時に来ても二重に数えない
- **ランキング (`/ranking`)**: 日間・週間・月間は直近 24 時間 / 7 日 / 30 日の
  時間バケットの合計、総合は総再生数で並べる。ゲームで絞り込める
- **急上昇 (`/trending`)**: 直近 48 時間の再生といいねを、12 時間で重みが半分になる
  減衰をかけて合計したスコアで並べる（いいね 1 件 = 再生 5 回ぶん）。
  総再生数が多いだけの古いクリップより、いま伸びているクリップが上に来る
- **シードの再生履歴**: シードクリップには、直近 30 日の再生履歴を `seeded = true` の行として作る
  （クリップ ID から決まる疑似乱数で、一部は直近 2 日に山を置く。`packages/shared` の
  `generateSeedViewHistory`）。ランキングと急上昇の見た目を確かめるための開発用で、
  「いま」を基準に作るので、シードを流すたびに作り直す（`seeded = false` の本物の記録には触らない）。
  クリップの総再生数には足さない
- **いいね**: 押した瞬間に表示を変え、API が失敗したら戻す（`useLike`）。
  未ログインなら `/login?next=<今の URL>` へ送り、ログイン後に戻ってくる
- **コメント**: PC は説明欄の下、スマホはフィード右側のボタンから下に開くシート
  （`CommentsSheet`）で読み書きする。どちらも `ClipComments` を使い、投稿・削除は
  API の結果で手元の一覧を更新する。投稿者は ID だけ保存し、表示時に `User` を引く。
  削除できるのは書いた本人とクリップの投稿者
- **プレイリスト**: 視聴ページの「保存」からチェックで追加・削除し、その場で新規作成もできる。
  `/playlists` が一覧（先頭に「高く評価したクリップ」= いいね一覧）、
  `/playlists/:id` が詳細で、持ち主は編集・削除・並べ替えができる。
  非公開のものは持ち主以外には 404 を返し、存在も漏らさない
- **プレイリスト再生**: `/clips/:id?list=<プレイリスト ID>` で開くと、PC は右側に一覧を出し
  最後まで見たら次のクリップへ進む。スマホはプレイリストの順にスワイプする
- **制限事項**: Cookie を消せば再生を数え直せる。本番では IP やログインユーザーも合わせて判定する

## 検索サジェスト・コメント欄・メンション・タグ付け・ホバー再生

- **検索サジェスト（`SearchBox`）**: ヘッダーの検索欄に入力すると、200ms 止まってから
  `GET /api/search/suggest?q=` を呼び、ゲーム名とクリップのタイトルを候補に出す（前方一致が先、
  各 5 件。`%` や `_` はただの文字として検索する）。↑↓ で候補を移動、Enter で開く、Esc で閉じる。
  候補を選ばずに Enter ならこれまでどおりキーワード検索（`/?q=`）。古い応答は捨てる
  （`useDebouncedFetch`）
- **コメント欄の非同期化（`CommentThread`）**: クリップと募集で共用する。
  ページの表示を待たせないよう、視聴ページはコメントを読み込まずに描画し、開いたあとにブラウザから
  1 ページ目（20 件）を読む（読み込み中はスケルトン）。続きは「もっと見る」で、
  `(created_at, id)` のカーソルで読む（新しいコメントが増えても、ずれたり重複したりしない）。
  投稿と削除は API の返事を待たずに画面へ反映し、失敗したら元に戻す（書いた文は入力欄に返す）。
  ページの再読み込み（`router.refresh()`）はしない。募集のコメントも同じ作りになり、
  新しい順の一覧になった（以前は古い順）。他の人の新しいコメントを自動で取り込む処理（ポーリング）は無い
- **メンション**: コメントの入力欄で `@` に続けて打つと、ユーザーの候補が出る（`MentionTextField`、
  `GET /api/users/search`）。投稿時に api が本文の `@ユーザー名` を解釈し、実在するユーザーだけを
  `mentions`（ユーザー ID）に保存して、`mentions: User[]` として返す（1 コメント 10 人まで、
  大文字小文字は区別しない）。表示（`CommentBody`）は、`mentions` にある `@名前` だけを強調し、
  実在しない `@xxx` やメールアドレスの `@` はただの文字のまま。
  **通知は無い**（呼ばれた人に知らせる仕組みは未実装）。プロフィールページも無いので、リンクにはしていない
- **タグ付け（Instagram 風）**: 映像の上の位置にユーザーのタグを付ける。位置は映像のコマに対する
  割合（`x`, `y`、0〜1、左上が原点）で `clip_tags` に保存する。割合なので、画面の大きさや映像の
  縦横比（黒帯の有無）が違っても、同じ人の上に出る。表示するときは、まず映像が実際に映っている長方形
  （`object-fit: contain` の結果）を求め（`lib/clip-tags.ts` の `containRect`、`useContentRect`）、
  その中に置く。縦横比は映像の `loadedmetadata` で知る
  - **投稿画面（`TagEditor`）**: 「タグを付ける」で映像を止め、映像の上をクリックした位置に、
    ユーザーを検索して付ける（`UserSearchField`、10 人まで、自分は除く）。札はドラッグで動かせ、
    × で外せる。黒帯の上のクリックは無視する。頭出しは、タグ付けを始める前にプレイヤーで済ませる
  - **視聴ページ**: 映像の左上の人物アイコン（`TagToggle`）で、札を出したり隠したりする
    （Instagram と同じく、押したときだけ出す。札の名前は表示専用）。ページには「タグ付けされた
    ユーザー」の一覧も出し、投稿者と付けられた本人は、そこから外せる（`ClipTags`）。
    スマホのフィードでは、右側のボタン列に「タグ」ボタンが出る
  - **api**: 投稿の `tags` は `[{ "username", "x", "y" }]` の JSON 配列。位置が 0〜1 の外、
    ユーザーが実在しない、10 人超、同じユーザーの重複（先のものだけ残す）、投稿者本人（除く）を検証する。
    `PUT /api/clips/:id/tags`（`{ tags: [...] }`）で入れ替え（投稿者だけ。`tags` の付け忘れは 400 で、
    黙って全部消えない）、`DELETE /api/clips/:id/tags/:userId` で 1 人外す（投稿者か本人）。
    タグは一覧・ランキング・急上昇・いいね・プレイリストなど、すべてのクリップの返り値に付く
    （スマホのフィードでも出せるように、1 回の問い合わせでまとめて引く）
  - **通知は無い**。投稿後にタグの位置や人を編集する画面も無い（api だけ）
- **サムネイルのホバー再生（`HoverPreview`）**: クリップカード・一覧の行・プレイリストの一覧で、
  サムネイルにマウスを乗せて 350ms たつと、動画の最初の 5 秒を無音で再生する。再生が始まったら
  サムネイルと入れ替え、5 秒たつ（または読み込みに失敗する）とサムネイルに戻る。外してもう一度乗せると
  頭から再生する。通り過ぎただけでは読み込まない。マウスのない端末（`hover: hover` でない）と、
  動きを減らす設定（`prefers-reduced-motion`）では動かさない。スマホのフィードには入れていない
- **既知の制限**: 開発用シードのクリップの動画（`commondatastorage.googleapis.com/gtv-videos-bucket/sample/`）は、
  配布元が 403 を返すため再生できない（ホバー再生も視聴ページも動かない）。アップロードしたクリップは動く

## 動画のアップロードと保存

```
ブラウザ (/upload の 3 フェーズ)             api (Hono。web の /api が転送する)
  | [1] 選択: ドロップ、<video> で長さを読み取る |
  | [2] 編集: 範囲・フィルター・テキスト・BGM     |
  |     「この範囲で進む」で mediabunny が書き出す（ブラウザ内、保存なし）
  | [3] 情報: サムネイルとタイトル等を決める      |
  |     コマを JPEG 化、または画像をアップロード  |
  |                                        |
  |-- POST /api/clips (multipart) -------->|  検証（MIME / サイズ / 長さ / ゲーム）
  |   video, thumbnail, title, gameId...   |  storage.put("<id>/video.mp4")
  |   (XHR で進捗表示)                      |  storage.put("<id>/thumb.<ext>")
  |                                        |  clips テーブルに登録
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
- **ストレージ層 (`apps/api/src/storage.ts`)**: `ClipStorage` インターフェースと
  ローカルディスク実装。キーは `<clipId>/video.<ext>` と `<clipId>/thumb.<ext>`
- **設定 (`apps/api/src/config.ts`)**: `DATA_DIR`、`MAX_UPLOAD_MB`、`MAX_THUMBNAIL_MB` を
  環境変数から読む。投稿の検証は `apps/api/src/uploads.ts`、配信は `media.ts`
- **制限事項**:
  - `formData()` はファイル全体をメモリに載せるため、巨大ファイルには向かない
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

## バックエンド (apps/api)

TypeScript 製のバックエンド。web のモック API から移行済みで、モックは削除した。

### 進捗

- **済（api）**: 読み取り API は一通り実装した（返す形と計算は、モック API だった頃と同じ）
  - ゲーム・クリップ: `GET /api/games`、`/api/games/:slug`、`/api/clips`、`/api/clips/:id`
    （`views` / `likes` / `commentCount` は、シードの初期値に記録分を足した現在の数）
  - `GET /api/clips/:id/comments`（新しい順）
  - `GET /api/ranking?period=&game=`、`GET /api/trending?game=`（計算式はモック API だった頃と同じ）
  - `GET /api/recruits?game=`、`/api/recruits/:id`
  - `GET /api/users`、`GET /api/auth/me`（Cookie `gca_session` を `sessions` テーブルで引く）
  - 要ログイン: `GET /api/me/likes`、`GET /api/playlists`。`GET /api/playlists/:id` は
    非公開なら持ち主だけ（他人には 404）。`GET /api/me/liked-clip-ids?ids=` は
    視聴ページの「いいね済み」表示用（モックにはなく、api で足した）
  - プローブ: `/api/healthz`（DB に触らない）、`/api/readyz`（DB 接続まで見る）
- **済（書き込み）**: web のモック API と同じ書き込みを、すべて api に実装した
  - 認証: `POST /api/auth/login`（`{ username }`）、`POST /api/auth/logout`。セッションは
    `sessions` テーブルに持ち、Cookie `gca_session`（httpOnly / SameSite=Lax / 7 日）で引く。
    期限切れの行は読まない
  - **デモログインは本物の認証ではない**（パスワードの検証が無い）。`production` では
    `DEMO_LOGIN=true` を明示したときだけ有効で、無効なら 403 を返す。compose では有効にしてある。
    k8s へ移すときに、Cloudflare 経由の Google OAuth に置き換える予定
  - 募集: `POST /api/recruits`、`POST /api/recruits/:id/comments`。DB に無制限の文字列を
    入れないよう、文字数の上限を付けた（タイトル 100 / 本文 2000 / ランク帯 50 /
    ポジション 10 個・各 30 / コメント 500）。モックにはなかった制限
  - いいね: `PUT` / `DELETE /api/clips/:id/like`（冪等、`{ liked, likes }`）
  - 再生の記録: `POST /api/clips/:id/view`。匿名 ID の Cookie（`gca_viewer`）で視聴者を区別し、
    同じ視聴者の 30 分以内の再生は数えない。判定は `clip_view_dedupe` への
    `INSERT ... ON CONFLICT` 1 回で行うので、api を複数動かしても、同時に来ても二重に数えない
    （モックはプロセスのメモリで判定していたため、再起動で消え、複数 Pod では揃わなかった）
  - クリップへのコメント: `POST /api/clips/:id/comments`、`DELETE .../comments/:commentId`
    （書いた本人かクリップの投稿者だけ削除できる）
  - プレイリスト: `POST /api/playlists`、`PATCH` / `DELETE /api/playlists/:id`、
    `POST /api/playlists/:id/clips`、`DELETE /api/playlists/:id/clips/:clipId`
    （他人の非公開は 404、他人の公開は 403）
  - クリップの投稿: `POST /api/clips`（multipart/form-data）。動画とサムネイルは
    `ClipStorage`（`src/storage.ts`、ローカルディスク）に保存し、`GET /api/media/*` で
    Range 付きで配信する。保存先は `DATA_DIR`（compose では `api-data` ボリューム）
- **済（web 側）**: モックストア（`mock-db.ts` と `/api/*` のモック実装）を削除した。
  web の読み書きはすべて api 経由（「現在の構成」参照）
- **移行の途中で見つけた制限**: Docker VM のメモリが少ない（Rancher Desktop の既定は 2GB）と、
  web のイメージのビルド（`next build`）が `cannot allocate memory` で失敗することがある。
  他のコンテナを止めてからビルドするか、VM のメモリを増やす
- **開発用シードの注意**: 見せかけの再生履歴（`clip_views_hourly.seeded = true`）は「いま」を
  基準に作るので、シードを流すたびに作り直す（`seeded = false` の本物の記録には触らない）。
  docker compose は api の起動のたびにシードを流す

### 構成

- `packages/shared` は TypeScript のソースのまま配布する（ビルドしない）。
  `@gamingclipapp/shared` は型だけ（クライアントコンポーネントからも読むため）、
  シードは `@gamingclipapp/shared/seed` に分けてあり、api のシードだけが使う
- api は tsup で依存ごと 1 つのバンドルにする。実行イメージに `node_modules` は要らない
- 返す JSON の形（`{ games }` / `{ game }` / `{ clips }` / `{ clip }` / `{ error }`）は
  モック API だった頃の形を引き継いでいる
- 並び順はシードの並び（`games.sort_order`）、クリップは新しい順

- バックエンドは Hono（軽量・Cloudflare Workers 互換）に決めた
- 動画ファイルはオブジェクトストレージ（自宅 K8s なら MinIO、Cloudflare なら R2）に保存し、
  アップロードは署名付き URL 方式にする（`ClipStorage` の実装を追加して差し替える）
- 認証は、k8s へ移すときに Cloudflare 経由の Google OAuth に置き換える（デモログインは暫定）

## インフラの段階的な計画

1. **ローカル（現在）**: `docker compose up --build` で web / api / PostgreSQL。ホストで開発するときは `docker compose up -d db api` のうえで `npm run dev`
2. **自宅 Kubernetes**:
   - `apps/web/Dockerfile`、`apps/api/Dockerfile` でイメージをビルドし、レジストリへ push
   - `k8s/` にマニフェストを置く（Deployment / Service / Ingress）
   - web は `/api/healthz`、api は liveness に `/api/healthz`、readiness に `/api/readyz` を使う
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

## 運用上の考慮

- `output: "standalone"` による軽量な本番イメージ
- マルチステージ Dockerfile、非 root 実行
- `/api/healthz` ヘルスチェックエンドポイント
- モノレポ構成（`npm workspaces`）。`packages/shared` で型を共有する
