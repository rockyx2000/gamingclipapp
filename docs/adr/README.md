# Architecture Decision Records

このアプリで決めたことと、その理由の記録。詳しい設計は [../architecture.md](../architecture.md)。
形式は「背景 / 決定 / 結果」。覆すときは古い ADR を消さず、状態を `置き換え済み` にして新しい ADR を足す。

| # | 決定 | 状態 |
|---|---|---|
| [0001](0001-monorepo.md) | npm workspaces のモノレポにする | 採用 |
| [0002](0002-backend-hono-drizzle-postgres.md) | バックエンドは Hono + Drizzle + PostgreSQL | 採用 |
| [0003](0003-docker-compose-until-k8s.md) | k8s へ移すまでは docker compose で動かす | 採用（暫定） |
| [0004](0004-web-proxies-to-api.md) | web のモックを廃し、すべて api 経由にする | 採用 |
| [0005](0005-demo-login-until-google-oauth.md) | 認証は暫定のデモログイン。本命は Cloudflare 経由の Google OAuth | 暫定 |
| [0006](0006-storage-abstraction.md) | 動画の保存先を ClipStorage で抽象化する | 採用 |
| [0007](0007-browser-side-editing.md) | 動画の編集と書き出しはブラウザ内で行う | 採用 |
| [0008](0008-view-counting.md) | 再生数は重複排除と 1 時間単位の集計で数える | 採用 |
| [0009](0009-comments-and-mentions.md) | コメントはカーソル式の非同期読み込み、メンションは配列列で持つ | 採用 |
| [0010](0010-positional-tags.md) | タグは映像上の相対位置で持つ | 採用 |
| [0011](0011-tag-permissions.md) | タグの付与は投稿者、削除は写った本人だけ | 採用 |
| [0012](0012-bundled-seed-videos.md) | シードの動画は、リポジトリに同梱した短い MP4 にする | 採用 |
