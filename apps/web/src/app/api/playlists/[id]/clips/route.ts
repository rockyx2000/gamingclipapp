import { getCurrentUser } from "@/lib/auth";
import { addClipToPlaylist, PlaylistError } from "@/lib/mock-db";
import { playlistErrorResponse, readJsonObject } from "@/lib/playlist-input";

// POST /api/playlists/:id/clips  { clipId } を末尾に追加する（持ち主のみ、追加済みなら何もしない）
export async function POST(request: Request, ctx: RouteContext<"/api/playlists/[id]/clips">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const { clipId } = await readJsonObject(request);
    if (typeof clipId !== "string" || !clipId) {
      throw new PlaylistError("クリップ ID が不正です", 400);
    }
    const playlist = await addClipToPlaylist(id, user.id, clipId);
    return Response.json({ playlist });
  } catch (err) {
    return playlistErrorResponse(err);
  }
}
