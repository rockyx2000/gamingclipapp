import { NextRequest } from "next/server";
import { listGames } from "@/lib/mock-db";

// GET /api/games?q=<検索語>&genre=<ジャンル>
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return Response.json({
    games: listGames({
      query: params.get("q") ?? undefined,
      genre: params.get("genre") ?? undefined,
    }),
  });
}
