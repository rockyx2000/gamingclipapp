import { getCurrentUser } from "@/lib/auth";
import { removeClipFromPlaylist } from "@/lib/mock-db";
import { playlistErrorResponse } from "@/lib/playlist-input";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// DELETE /api/playlists/:id/clips/:clipId  プレイリストから外す（持ち主のみ）
export async function DELETE(request: Request,
  ctx: RouteContext<"/api/playlists/[id]/clips/[clipId]">,) {
  if (API_URL) return proxyToApi(request);
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id, clipId } = await ctx.params;
  try {
    const playlist = await removeClipFromPlaylist(id, user.id, clipId);
    return Response.json({ playlist });
  } catch (err) {
    return playlistErrorResponse(err);
  }
}
