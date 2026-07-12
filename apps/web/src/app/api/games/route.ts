import { NextRequest } from "next/server";
import { listGames } from "@/lib/mock-db";

// GET /api/games?q=<検索語>
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  return Response.json({ games: listGames(query) });
}
