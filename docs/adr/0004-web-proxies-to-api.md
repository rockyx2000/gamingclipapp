# 0004 web のモックを廃し、すべて api 経由にする

## 背景
web が `mock-db` と独自のストレージを持つ二重構成で、api と挙動がずれていた。

## 決定
web のモック層（`mock-db`、`storage` など）を削除した。読み書きは `lib/api.ts` から api を呼ぶ。ブラウザの `/api/...` は、`apps/web/src/app/api/[...path]/route.ts` が api へそのまま転送する（`/api/healthz` だけ web 自身が返す）。転送では `gca_session` と `gca_viewer` の Cookie を引き継ぎ、本文はストリームで渡す（`duplex: "half"`）。

## 結果
- 真実のデータは api の 1 か所。
- web は状態を持たない。
- api のエンドポイントを足しても、web 側の Route Handler は増やさなくてよい。
