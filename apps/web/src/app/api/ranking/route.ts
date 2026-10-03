import { NextRequest } from "next/server";
import { isRankingPeriod, listRanking } from "@/lib/mock-db";

// GET /api/ranking?period=day|week|month|all&game=<slug>
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const period = params.get("period") ?? "day";
  if (!isRankingPeriod(period)) {
    return Response.json({ error: "period が不正です" }, { status: 400 });
  }
  const clips = listRanking({ period, gameSlug: params.get("game") ?? undefined });
  return Response.json({ period, clips });
}
