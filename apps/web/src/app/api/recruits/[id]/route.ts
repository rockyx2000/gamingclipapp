import { getRecruit } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/recruits/:id
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/recruits/[id]">,
) {
  if (API_URL) return proxyToApi(request);
  const { id } = await ctx.params;
  const recruit = getRecruit(id);
  if (!recruit) {
    return Response.json({ error: "募集が見つかりません" }, { status: 404 });
  }
  return Response.json({ recruit });
}
