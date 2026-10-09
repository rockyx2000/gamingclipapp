# 0001 npm workspaces のモノレポにする

## 背景
web（Next.js）と api、両者が使う型が同じ変更で動くことが多い。

## 決定
`apps/web`、`apps/api`、`packages/shared` の npm workspaces にする。ドメイン型とシードデータは `packages/shared` に置く。

## 結果
- 型の変更が web と api で同時に効き、1 つの PR にまとめられる。
- api は tsup で `noExternal: [/.*/]` として 1 ファイルに束ね、Workers へ移しやすくしている。
- Docker のビルドはリポジトリ全体を文脈にする。
