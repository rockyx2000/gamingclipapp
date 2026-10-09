# 0006 動画の保存先を ClipStorage で抽象化する

## 背景
今はローカルディスク、将来は R2。

## 決定
api の保存処理を `ClipStorage` に閉じ込める。実装は `DATA_DIR` 配下のローカルディスク。配信は `/api/media/*` で、Range リクエストに対応する。サムネイルのキーは `${clipId}/thumb-<8 文字><ext>` で、差し替え時に古いものを消す。

## 結果
- R2 への移行は、`ClipStorage` の実装を足すだけで済む。
- クリップの削除は、DB の行を先に消し（FK のカスケード）、そのあと `deletePrefix(clipId)` で保存先を消す。
