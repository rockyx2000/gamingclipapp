// Hono アプリ本体。DB を受け取るので、テストや別のランタイム（Workers）からも組み立てられる。

import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie } from "hono/cookie";
import { logger } from "hono/logger";
import { sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { getClip, getGame, listClips, listGames } from "./queries";
import { getPlaylist, listPlaylistsByOwner } from "./playlists";
import { isRankingPeriod, listRanking, listTrending } from "./ranking";
import { addRecruit, addRecruitComment, getRecruit, listRecruitComments, listRecruits } from "./recruits";
import { decodeCursor, parseLimit } from "./comment-page";
import { searchUsers, suggest } from "./search";
import { removeTag, setTags } from "./tags";
import { MAX_CLIP_COMMENT_LENGTH } from "@gamingclipapp/shared";
import { deleteClip, replaceThumbnail, updateClip } from "./clip-edit";
import { MAX_THUMBNAIL_BYTES, MAX_UPLOAD_BYTES, config } from "./config";
import { HttpError } from "./errors";
import { serveMedia } from "./media";
import { parseCreateBody, parsePatchBody, readJsonObject } from "./playlist-input";
import {
  addClipToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeClipFromPlaylist,
  updatePlaylist,
} from "./playlists";
import { addClipComment, deleteClipComment, recordView, setLike } from "./social-writes";
import { createClipFromForm } from "./uploads";
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

const VIEWER_COOKIE = "gca_viewer";

// ログイン必須のルート用。未ログインなら 401 を投げる
async function requireUser(db: Db, c: Context) {
  const user = await currentUser(db, c);
  if (!user) throw new HttpError("ログインが必要です", 401);
  return user;
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

  // GET /api/clips/:id/comments?limit=&cursor=  コメント一覧（新しい順、ログイン不要）。
  // { comments, nextCursor }。nextCursor を cursor に渡すと続きが読める（null なら最後）
  app.get("/api/clips/:id/comments", async (c) => {
    const cursorParam = c.req.query("cursor");
    const cursor = cursorParam ? decodeCursor(cursorParam) : undefined;
    if (cursorParam && !cursor) return c.json({ error: "cursor が不正です" }, 400);
    const page = await listClipComments(db, c.req.param("id"), {
      limit: parseLimit(c.req.query("limit")),
      cursor,
    });
    if (!page) return c.json({ error: "クリップが見つかりません" }, 404);
    return c.json(page);
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

  // GET /api/recruits/:id/comments?limit=&cursor=  募集のコメント一覧（新しい順）。形はクリップと同じ
  app.get("/api/recruits/:id/comments", async (c) => {
    const cursorParam = c.req.query("cursor");
    const cursor = cursorParam ? decodeCursor(cursorParam) : undefined;
    if (cursorParam && !cursor) return c.json({ error: "cursor が不正です" }, 400);
    const page = await listRecruitComments(db, c.req.param("id"), {
      limit: parseLimit(c.req.query("limit")),
      cursor,
    });
    if (!page) return c.json({ error: "募集が見つかりません" }, 404);
    return c.json(page);
  });

  // GET /api/recruits/:id
  app.get("/api/recruits/:id", async (c) => {
    const recruit = await getRecruit(db, c.req.param("id"));
    if (!recruit) return c.json({ error: "募集が見つかりません" }, 404);
    return c.json({ recruit });
  });

  // GET /api/search/suggest?q=  ヘッダーの検索欄の候補（ゲームとクリップ）
  app.get("/api/search/suggest", async (c) => c.json(await suggest(db, c.req.query("q") ?? "")));

  // GET /api/users/search?q=  ユーザーの検索（@メンション・タグ付けの候補。要ログイン）
  app.get("/api/users/search", async (c) => {
    await requireUser(db, c);
    return c.json({ users: await searchUsers(db, c.req.query("q") ?? "") });
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

  // PUT / DELETE /api/clips/:id/like  いいねする / 外す（要ログイン、冪等）。{ liked, likes } を返す
  for (const [method, liked] of [["put", true], ["delete", false]] as const) {
    app[method]("/api/clips/:id/like", async (c) => {
      const user = await currentUser(db, c);
      if (!user) return c.json({ error: "ログインが必要です" }, 401);
      const result = await setLike(db, c.req.param("id"), user.id, liked);
      if (!result) return c.json({ error: "クリップが見つかりません" }, 404);
      return c.json(result);
    });
  }

  // POST /api/clips/:id/view  再生を 1 回記録する（ログイン不要）。
  // 視聴者は匿名 ID の Cookie で区別し、同じ人が短時間に見直した分は数えない
  app.post("/api/clips/:id/view", async (c) => {
    let viewerKey = getCookie(c, VIEWER_COOKIE);
    if (!viewerKey) {
      viewerKey = crypto.randomUUID();
      setCookie(c, VIEWER_COOKIE, viewerKey, {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        secure: config.cookieSecure,
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    const counted = await recordView(db, c.req.param("id"), viewerKey);
    if (counted === undefined) return c.json({ error: "クリップが見つかりません" }, 404);
    return c.json({ counted });
  });

  // POST /api/clips/:id/comments  { body } でコメントする（要ログイン）
  app.post("/api/clips/:id/comments", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    const payload = await readObject(c);
    if (!payload) return c.json({ error: "JSON で送信してください" }, 400);
    const body = typeof payload.body === "string" ? payload.body.trim() : "";
    if (!body) return c.json({ error: "コメントを入力してください" }, 400);
    if (body.length > MAX_CLIP_COMMENT_LENGTH) {
      return c.json({ error: `コメントは${MAX_CLIP_COMMENT_LENGTH}文字以内にしてください` }, 400);
    }
    const comment = await addClipComment(db, c.req.param("id"), user, body);
    if (!comment) return c.json({ error: "クリップが見つかりません" }, 404);
    return c.json({ comment }, 201);
  });

  // DELETE /api/clips/:id/comments/:commentId  コメントした本人か、クリップの投稿者だけが削除できる
  app.delete("/api/clips/:id/comments/:commentId", async (c) => {
    const user = await currentUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    const result = await deleteClipComment(db, c.req.param("id"), c.req.param("commentId"), user.id);
    if (result === "not_found") return c.json({ error: "コメントが見つかりません" }, 404);
    if (result === "forbidden") return c.json({ error: "このコメントは削除できません" }, 403);
    return c.body(null, 204);
  });

  // PUT /api/clips/:id/tags  { tags: [{ username, x, y }] } でタグを入れ替える（投稿者だけ）
  app.put("/api/clips/:id/tags", async (c) => {
    const user = await requireUser(db, c);
    const { tags } = await readJsonObject(c);
    // tags の付け忘れ（や旧形式のキー）で、黙って全タグが消えないようにする
    if (!Array.isArray(tags)) throw new HttpError("tags に配列を指定してください", 400);
    return c.json({ tags: await setTags(db, c.req.param("id"), user.id, tags) });
  });

  // DELETE /api/clips/:id/tags/:userId  タグを外す（投稿者か、タグ付けされた本人）
  app.delete("/api/clips/:id/tags/:userId", async (c) => {
    const user = await requireUser(db, c);
    return c.json({ tags: await removeTag(db, c.req.param("id"), c.req.param("userId"), user.id) });
  });

  // POST /api/playlists  作成（要ログイン）{ title, description?, visibility?, clipId? }
  app.post("/api/playlists", async (c) => {
    const user = await requireUser(db, c);
    const input = parseCreateBody(await readJsonObject(c));
    return c.json({ playlist: await createPlaylist(db, { ...input, ownerId: user.id }) }, 201);
  });

  // PATCH /api/playlists/:id  タイトル・説明・公開設定・並び順の変更（持ち主のみ）
  app.patch("/api/playlists/:id", async (c) => {
    const user = await requireUser(db, c);
    const patch = parsePatchBody(await readJsonObject(c));
    return c.json({ playlist: await updatePlaylist(db, c.req.param("id"), user.id, patch) });
  });

  // DELETE /api/playlists/:id  削除（持ち主のみ）
  app.delete("/api/playlists/:id", async (c) => {
    const user = await requireUser(db, c);
    await deletePlaylist(db, c.req.param("id"), user.id);
    return c.body(null, 204);
  });

  // POST /api/playlists/:id/clips  { clipId } を末尾に追加する（持ち主のみ、追加済みなら何もしない）
  app.post("/api/playlists/:id/clips", async (c) => {
    const user = await requireUser(db, c);
    const { clipId } = await readJsonObject(c);
    if (typeof clipId !== "string" || !clipId) throw new HttpError("クリップ ID が不正です", 400);
    return c.json({ playlist: await addClipToPlaylist(db, c.req.param("id"), user.id, clipId) });
  });

  // DELETE /api/playlists/:id/clips/:clipId  プレイリストから外す（持ち主のみ）
  app.delete("/api/playlists/:id/clips/:clipId", async (c) => {
    const user = await requireUser(db, c);
    const playlist = await removeClipFromPlaylist(db, c.req.param("id"), user.id, c.req.param("clipId"));
    return c.json({ playlist });
  });

  // PATCH /api/clips/:id  { title?, description?, gameId? } でクリップの情報を編集する（投稿者だけ）
  app.patch("/api/clips/:id", async (c) => {
    const user = await requireUser(db, c);
    const patch = await readJsonObject(c);
    return c.json({ clip: await updateClip(db, c.req.param("id"), user.id, patch) });
  });

  // PUT /api/clips/:id/thumbnail  サムネイル画像を差し替える（投稿者だけ、multipart/form-data の thumbnail）
  app.put(
    "/api/clips/:id/thumbnail",
    bodyLimit({
      maxSize: MAX_THUMBNAIL_BYTES + 1024 * 1024,
      onError: (c) => c.json({ error: "ファイルサイズが大きすぎます" }, 413),
    }),
    async (c) => {
      const user = await requireUser(db, c);
      const form = await c.req.formData().catch(() => {
        throw new HttpError("multipart/form-data で送信してください", 400);
      });
      return c.json({ clip: await replaceThumbnail(db, c.req.param("id"), user.id, form.get("thumbnail")) });
    },
  );

  // DELETE /api/clips/:id  クリップを削除する（投稿者だけ）
  app.delete("/api/clips/:id", async (c) => {
    const user = await requireUser(db, c);
    await deleteClip(db, c.req.param("id"), user.id);
    return c.body(null, 204);
  });

  // POST /api/clips  クリップ投稿（要ログイン、multipart/form-data）
  app.post(
    "/api/clips",
    bodyLimit({
      // 動画 + サムネイル + フォームの余白
      maxSize: MAX_UPLOAD_BYTES + MAX_THUMBNAIL_BYTES + 1024 * 1024,
      onError: (c) => c.json({ error: "ファイルサイズが大きすぎます" }, 413),
    }),
    async (c) => {
      const user = await requireUser(db, c);
      const form = await c.req.formData().catch(() => {
        throw new HttpError("multipart/form-data で送信してください", 400);
      });
      return c.json({ clip: await createClipFromForm(db, form, user) }, 201);
    },
  );

  // GET /api/media/<clipId>/video.mp4  アップロードされた動画・サムネイルの配信（Range 対応）
  app.get("/api/media/*", (c) => {
    const key = decodeURIComponent(c.req.path.slice("/api/media/".length));
    return serveMedia(c, key);
  });

  app.notFound((c) => c.json({ error: "見つかりません" }, 404));
  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: "サーバーでエラーが発生しました" }, 500);
  });

  return app;
}
