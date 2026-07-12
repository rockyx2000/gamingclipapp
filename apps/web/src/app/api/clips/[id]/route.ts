import { getClip } from "@/lib/mock-db";

// GET /api/clips/:id
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/clips/[id]">,
) {
  const { id } = await ctx.params;
  const clip = getClip(id);
  if (!clip) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json({ clip });
}
