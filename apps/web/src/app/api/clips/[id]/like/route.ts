import { getCurrentUser } from "@/lib/auth";
import { setLike } from "@/lib/mock-db";

// PUT /api/clips/:id/like     いいねする（要ログイン）
// DELETE /api/clips/:id/like  いいねを外す（要ログイン）
// どちらも冪等。レスポンスは { liked, likes }（likes は最新の総数）
async function handle(ctx: RouteContext<"/api/clips/[id]/like">, liked: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const result = await setLike(id, user.id, liked);
  if (!result) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json(result);
}

export async function PUT(_request: Request, ctx: RouteContext<"/api/clips/[id]/like">) {
  return handle(ctx, true);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/clips/[id]/like">) {
  return handle(ctx, false);
}
