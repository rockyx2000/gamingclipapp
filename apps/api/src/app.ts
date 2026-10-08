// Hono アプリ本体。DB を受け取るので、テストや別のランタイム（Workers）からも組み立てられる。

import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { getClip, getGame, listClips, listGames } from "./queries";
import { getPlaylist, listPlaylistsByOwner } from "./playlists";
import { isRankingPeriod, listRanking, listTrending } from "./ranking";
import { addRecruit, addRecruitComment, getRecruit, listRecruits } from "./recruits";
import { config } from "./config";
import { currentUser, listUsers, login, logout } from "./session";
import { likedClipIds, listClipComments, listLikedClips } from "./social";

// 募集まわりの入力の上限（DB に無制限の文字列を入れないための安全弁）
const RECRUIT_LIMITS = { title: 100, body: 2000, rank: 50, positions: 10, position: 30, comment: 500 };

// JSON ボディをオブジェクトとして読む。JSON でなければ undefined
async function readObject(c: Context): Promise<Record<string, unknown> | undefined> {
  const value: unknown = await c.req.json().catch(() => undefined);
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

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

  // ---- 書き込み ----

  // POST /api/auth/login  { username } でログインする（デモログイン。パスワードの検証は無い）
  app.post("/api/auth/login", async (c) => {
    if (!config.demoLogin) {
      return c.json({ error: "このサーバーではデモログインは使えません" }, 403);
    }
    const payload = await readObject(c);
    const username = typeof payload?.username === "string" ? payload.username : "";
    if (!username) return c.json({ error: "ユーザー名が必要です" }, 400);
    const user = await login(db, c, username);
    if (!user) return c.json({ error: "ユーザーが見つかりません" }, 401);
    return c.json({ user });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", async (c) => {
    await logout(db, c);
    return c.json({ ok: true });
  });

  // POST /api/recruits  募集投稿（要ログイン）
  app.post("/api/recruits", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    const p = await readObject(c);
    const gameId = typeof p?.gameId === "string" ? p.gameId : "";
    const title = typeof p?.title === "string" ? p.title.trim() : "";
    const body = typeof p?.body === "string" ? p.body.trim() : "";
    if (!gameId || !title || !body) return c.json({ error: "入力内容が不正です" }, 400);
    if (title.length > RECRUIT_LIMITS.title) {
      return c.json({ error: `タイトルは${RECRUIT_LIMITS.title}文字以内にしてください` }, 400);
    }
    if (body.length > RECRUIT_LIMITS.body) {
      return c.json({ error: `本文は${RECRUIT_LIMITS.body}文字以内にしてください` }, 400);
    }
    const positions = Array.isArray(p?.positions)
      ? p.positions.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim())
      : [];
    if (positions.length > RECRUIT_LIMITS.positions || positions.some((x) => x.length > RECRUIT_LIMITS.position)) {
      return c.json({ error: "募集ポジションが多すぎるか長すぎます" }, 400);
    }
    const rank = typeof p?.rank === "string" ? p.rank.trim() : "";
    if (rank.length > RECRUIT_LIMITS.rank) {
      return c.json({ error: `ランク帯は${RECRUIT_LIMITS.rank}文字以内にしてください` }, 400);
    }
    const recruit = await addRecruit(db, {
      gameId,
      title,
      body,
      positions,
      rank: rank || undefined,
      author: user,
    });
    if (!recruit) return c.json({ error: "ゲームが見つかりません" }, 400);
    return c.json({ recruit }, 201);
  });

  // POST /api/recruits/:id/comments  { body } でコメントする（要ログイン）
  app.post("/api/recruits/:id/comments", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    const p = await readObject(c);
    const body = typeof p?.body === "string" ? p.body.trim() : "";
    if (!body) return c.json({ error: "コメント本文が必要です" }, 400);
    if (body.length > RECRUIT_LIMITS.comment) {
      return c.json({ error: `コメントは${RECRUIT_LIMITS.comment}文字以内にしてください` }, 400);
    }
    const comment = await addRecruitComment(db, c.req.param("id"), user, body);
    if (!comment) return c.json({ error: "募集が見つかりません" }, 404);
    return c.json({ comment }, 201);
  });

  app.notFound((c) => c.json({ error: "見つかりません" }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });

  return app;
}
