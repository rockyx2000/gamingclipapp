# 0009 コメントはカーソル式の非同期読み込み、メンションは配列列で持つ

## 決定
- コメントは `(created_at, id)` のカーソル（base64url）で、20 件ずつ取る。web の `CommentThread` は楽観的に表示する。
- メンションは `clip_comments` と `recruit_comments` の `mentions text[]` に入れる。api が本文の `@username` を既存ユーザーに解決し、1 件のコメントのメンション数に上限（`MAX_MENTIONS_PER_COMMENT`）を置く。
- 入力中のユーザー候補は `GET /api/users/search?q=`（要ログイン）を使う。

## 結果
- 新着の自動取り込み（ポーリング）はまだ無い。
- メンションの通知は、認証の導入後に回す。
