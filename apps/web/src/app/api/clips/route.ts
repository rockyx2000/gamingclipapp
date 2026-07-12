import { NextRequest } from "next/server";
import { addClip, listClips } from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";
import type { ClipType } from "@/lib/types";

// GET /api/clips?game=<slug>&type=<clip|short>&q=<検索語>
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const clips = listClips({
    gameSlug: params.get("game") ?? undefined,
    type: type === "clip" || type === "short" ? (type as ClipType) : undefined,
    query: params.get("q") ?? undefined,
  });
  return Response.json({ clips });
}

// POST /api/clips  クリップ投稿（要ログイン）
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, type, gameId, durationSec } = body;

  if (!title || !gameId || (type !== "clip" && type !== "short")) {
    return Response.json({ error: "入力内容が不正です" }, { status: 400 });
  }
  const maxDuration = type === "short" ? 60 : 120;
  const duration = Number(durationSec) || (type === "short" ? 15 : 60);
  if (duration > maxDuration) {
    return Response.json(
      { error: `動画の長さは最大${maxDuration}秒です` },
      { status: 400 },
    );
  }

  const clip = addClip({
    title,
    description: description ?? "",
    type,
    gameId,
    durationSec: duration,
    uploader: user,
  });
  return Response.json({ clip }, { status: 201 });
}
