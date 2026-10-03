import { NextRequest } from "next/server";
import { listTrending } from "@/lib/mock-db";

// GET /api/trending?game=<slug>
export async function GET(request: NextRequest) {
  const gameSlug = request.nextUrl.searchParams.get("game") ?? undefined;
  return Response.json({ clips: listTrending({ gameSlug }) });
}
