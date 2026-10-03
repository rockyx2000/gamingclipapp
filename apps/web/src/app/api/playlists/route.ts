import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPlaylist, listPlaylistsByOwner } from "@/lib/mock-db";
import {
  parseCreateBody,
  playlistErrorResponse,
  readJsonObject,
} from "@/lib/playlist-input";

// GET /api/playlists  自分のプレイリスト一覧（要ログイン）
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  return Response.json({ playlists: listPlaylistsByOwner(user.id) });
}

// POST /api/playlists  作成（要ログイン）
// { title, description?, visibility?: "public" | "private", clipId? }
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  try {
    const input = parseCreateBody(await readJsonObject(request));
    const playlist = await createPlaylist({ ...input, ownerId: user.id });
    return Response.json({ playlist }, { status: 201 });
  } catch (err) {
    return playlistErrorResponse(err);
  }
}
