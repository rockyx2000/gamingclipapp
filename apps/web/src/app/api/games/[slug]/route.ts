import { getGame } from "@/lib/games";

// GET /api/games/:slug
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/games/[slug]">,
) {
  const { slug } = await ctx.params;
  const game = await getGame(slug);
  if (!game) {
    return Response.json({ error: "ゲームが見つかりません" }, { status: 404 });
  }
  return Response.json({ game });
}
