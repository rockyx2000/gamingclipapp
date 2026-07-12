import { NextRequest } from "next/server";
import { addRecruit, listRecruits } from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/recruits?game=<slug>
export async function GET(request: NextRequest) {
  const gameSlug = request.nextUrl.searchParams.get("game") ?? undefined;
  return Response.json({ recruits: listRecruits(gameSlug) });
}

// POST /api/recruits  募集投稿（要ログイン）
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const { gameId, title, body: postBody, positions, rank } = body;
  if (!gameId || !title || !postBody) {
    return Response.json({ error: "入力内容が不正です" }, { status: 400 });
  }

  const recruit = addRecruit({
    gameId,
    title,
    body: postBody,
    positions: Array.isArray(positions) ? positions : [],
    rank: rank || undefined,
    author: user,
  });
  return Response.json({ recruit }, { status: 201 });
}
