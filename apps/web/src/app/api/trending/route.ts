import { NextRequest } from "next/server";
import { listTrending } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/trending?game=<slug>
export async function GET(request: NextRequest) {
  if (API_URL) return proxyToApi(request);
  const gameSlug = request.nextUrl.searchParams.get("game") ?? undefined;
  return Response.json({ clips: listTrending({ gameSlug }) });
}
