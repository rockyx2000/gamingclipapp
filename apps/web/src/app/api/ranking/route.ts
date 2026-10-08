import { NextRequest } from "next/server";
import { isRankingPeriod, listRanking } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/ranking?period=day|week|month|all&game=<slug>
export async function GET(request: NextRequest) {
  if (API_URL) return proxyToApi(request);
  const params = request.nextUrl.searchParams;
  const period = params.get("period") ?? "day";
  if (!isRankingPeriod(period)) {
    return Response.json({ error: "period が不正です" }, { status: 400 });
  }
  const clips = listRanking({ period, gameSlug: params.get("game") ?? undefined });
  return Response.json({ period, clips });
}
