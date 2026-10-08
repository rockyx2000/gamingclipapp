// Hono アプリ本体。DB を受け取るので、テストや別のランタイム（Workers）からも組み立てられる。

import { Hono } from "hono";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { getClip, getGame, listClips, listGames } from "./queries";
import { getPlaylist, listPlaylistsByOwner } from "./playlists";
import { isRankingPeriod, listRanking, listTrending } from "./ranking";
import { getRecruit, listRecruits } from "./recruits";
import { currentUser, listUsers } from "./session";
import { likedClipIds, listClipComments, listLikedClips } from "./social";

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

  // GET /api/clips/:id/comments  コメント一覧（新しい順、ログイン不要）
  app.get("/api/clips/:id/comments", async (c) => {
    const comments = await listClipComments(db, c.req.param("id"));
    if (!comments) return c.json({ error: "クリップが見つかりません" }, 404);
    return c.json({ comments });
  });

  // GET /api/ranking?period=day|week|month|all&game=<slug>
  app.get("/api/ranking", async (c) => {
    const period = c.req.query("period") ?? "day";
    if (!isRankingPeriod(period)) return c.json({ error: "period が不正です" }, 400);
    const clips = await listRanking(db, { period, gameSlug: c.req.query("game") });
    return c.json({ period, clips });
  });

  // GET /api/trending?game=<slug>
  app.get("/api/trending", async (c) => {
    return c.json({ clips: await listTrending(db, { gameSlug: c.req.query("game") }) });
  });

  // GET /api/me/likes  自分がいいねしたクリップ（要ログイン）
  app.get("/api/me/likes", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    return c.json({ clips: await listLikedClips(db, user.id) });
  });

  // GET /api/me/liked-clip-ids?ids=c1,c2  渡したクリップのうち自分がいいねしているもの（要ログイン）
  app.get("/api/me/liked-clip-ids", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    const ids = (c.req.query("ids") ?? "").split(",").filter(Boolean);
    return c.json({ clipIds: await likedClipIds(db, user.id, ids) });
  });

  // GET /api/playlists  自分のプレイリスト一覧（要ログイン）
  app.get("/api/playlists", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    return c.json({ playlists: await listPlaylistsByOwner(db, user.id) });
  });

  // GET /api/playlists/:id  公開は誰でも、非公開は持ち主だけ（他人には 404）
  app.get("/api/playlists/:id", async (c) => {
    const user = await currentUser(db, c);
    const playlist = await getPlaylist(db, c.req.param("id"), user?.id);
    if (!playlist) return c.json({ error: "プレイリストが見つかりません" }, 404);
    return c.json({ playlist });
  });

  // GET /api/recruits?game=<slug>
  app.get("/api/recruits", async (c) => {
    return c.json({ recruits: await listRecruits(db, c.req.query("game")) });
  });

  // GET /api/recruits/:id
  app.get("/api/recruits/:id", async (c) => {
    const recruit = await getRecruit(db, c.req.param("id"));
    if (!recruit) return c.json({ error: "募集が見つかりません" }, 404);
    return c.json({ recruit });
  });

  // GET /api/users  デモユーザー一覧（モックログイン用）
  app.get("/api/users", async (c) => c.json({ users: await listUsers(db) }));

  // GET /api/auth/me  現在のログインユーザー（未ログインなら user: null）
  app.get("/api/auth/me", async (c) => c.json({ user: (await currentUser(db, c)) ?? null }));

  app.notFound((c) => c.json({ error: "見つかりません" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });

  return app;
}
