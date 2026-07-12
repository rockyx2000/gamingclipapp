import { getRecruit } from "@/lib/mock-db";

// GET /api/recruits/:id
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/recruits/[id]">,
) {
  const { id } = await ctx.params;
  const recruit = getRecruit(id);
  if (!recruit) {
    return Response.json({ error: "募集が見つかりません" }, { status: 404 });
  }
  return Response.json({ recruit });
}
