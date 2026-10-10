# 0002 バックエンドは Hono + Drizzle + PostgreSQL

## 背景
最終的な配備先は Cloudflare Workers + R2。当初の web 内モックを、本物のバックエンドに置き換える必要があった。

## 決定
- フレームワークは Hono（Workers でも動く）。
- ORM は Drizzle（postgres-js）。マイグレーションは drizzle-kit（0000〜0004）。
- DB は PostgreSQL。

## 結果
- ランタイム非依存のコードを保てば、Workers へ移すとき書き換えが小さい。
- 生 SQL を書くときは、drizzle が列を修飾しない点に注意する（`"games"."id"` と明記する）。`Date` を生 SQL に直接束縛せず、`lte` / `lt` を使う。

## 検討した代替
Prisma などの別の ORM。Workers との相性と、SQL に近い書き味から Drizzle を選んだ。
