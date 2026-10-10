# 0012 シードの動画は、リポジトリに同梱した短い MP4 にする

## 背景
シードのクリップの動画 URL が存在せず、再生できなかった。

## 決定
`apps/api/seed-media/*.mp4`（H.264、8〜20 秒、5 本で約 2MB）を同梱する。シードが保存先の `seed/<name>.mp4` へ、サイズが違うときだけコピーする。シード 20 件は、この 5 本を使い回し、`durationSec` も合わせる。再実行では、動画まわりの 4 列（`videoUrl`、`durationSec`、`mimeType`、`sizeBytes`）だけを `onConflictDoUpdate` で更新する。

## 結果
- 外部の動画に頼らず、オフラインでも再生できる。
- Dockerfile でも `seed-media` をイメージに入れている。
