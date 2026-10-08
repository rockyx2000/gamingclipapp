import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { config } from "./config";
import { createDb } from "./db/client";

const { db, sql } = createDb(config.databaseUrl);
const server = serve({ fetch: createApp(db).fetch, port: config.port }, (info) => {
  console.log(`api listening on :${info.port}`);
});

// コンテナの停止（SIGTERM）で、処理中のリクエストと DB 接続を片付けてから終わる
function shutdown() {
  server.close(() => {
    void sql.end().then(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
