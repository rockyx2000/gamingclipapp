// Hono アプリ本体。DB を受け取るので、テストや別のランタイム（Workers）からも組み立てられる。

import { Hono } from "hono";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { getClip, getGame, listClips, listGames } from "./queries";

export function createApp(db: Db) {
  const app = new Hono();
  app.use(logger());

  // プローブ用。liveness は DB に触らず、readiness は DB に繋がることまで見る
  app.get("/api/healthz", (c) => c.json({ status: "ok" }));
  app.get("/api/readyz", async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  // GET /api/games?q=<検索語>&genre=<ジャンル>
  app.get("/api/games", async (c) => {
    const games = await listGames(db, { query: c.req.query("q"), genre: c.req.query("genre") });
    return c.json({ games });
  });

  // GET /api/games/:slug
  app.get("/api/games/:slug", async (c) => {
    const game = await getGame(db, c.req.param("slug"));
    if (!game) return c.json({ error: "ゲームが見つかりません" }, 404);
    return c.json({ game });
  });

  // GET /api/clips?game=<slug>&q=<検索語>
  app.get("/api/clips", async (c) => {
    const clips = await listClips(db, { gameSlug: c.req.query("game"), query: c.req.query("q") });
    return c.json({ clips });
  });

  // GET /api/clips/:id
  app.get("/api/clips/:id", async (c) => {
    const clip = await getClip(db, c.req.param("id"));
    if (!clip) return c.json({ error: "クリップが見つかりません" }, 404);
    return c.json({ clip });
  });

  app.notFound((c) => c.json({ error: "見つかりません" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });

  return app;
}
