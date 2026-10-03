import { getCurrentUser } from "@/lib/auth";
import { deletePlaylist, getPlaylist, updatePlaylist } from "@/lib/mock-db";
import {
  parsePatchBody,
  playlistErrorResponse,
  readJsonObject,
} from "@/lib/playlist-input";

// GET /api/playlists/:id  公開プレイリストは誰でも、非公開は持ち主だけ見られる
export async function GET(_request: Request, ctx: RouteContext<"/api/playlists/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const playlist = getPlaylist(id, user?.id);
  if (!playlist) {
    return Response.json({ error: "プレイリストが見つかりません" }, { status: 404 });
  }
  return Response.json({ playlist });
}

// PATCH /api/playlists/:id  タイトル・説明・公開設定・並び順の変更（持ち主のみ）
export async function PATCH(request: Request, ctx: RouteContext<"/api/playlists/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const patch = parsePatchBody(await readJsonObject(request));
    const playlist = await updatePlaylist(id, user.id, patch);
    return Response.json({ playlist });
  } catch (err) {
    return playlistErrorResponse(err);
  }
}

// DELETE /api/playlists/:id  削除（持ち主のみ）
export async function DELETE(_request: Request, ctx: RouteContext<"/api/playlists/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await deletePlaylist(id, user.id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return playlistErrorResponse(err);
  }
}
