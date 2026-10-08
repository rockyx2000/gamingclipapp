import { getClip } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/clips/:id
export async function GET(request: Request,
  ctx: RouteContext<"/api/clips/[id]">,) {
  if (API_URL) return proxyToApi(request);
  const { id } = await ctx.params;
  const clip = getClip(id);
  if (!clip) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json({ clip });
}
