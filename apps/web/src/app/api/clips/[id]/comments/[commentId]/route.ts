import { getCurrentUser } from "@/lib/auth";
import { deleteClipComment } from "@/lib/mock-db";

// DELETE /api/clips/:id/comments/:commentId
// コメントした本人か、クリップの投稿者だけが削除できる
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/clips/[id]/comments/[commentId]">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  const { id, commentId } = await ctx.params;
  const result = await deleteClipComment(id, commentId, user.id);
  if (result === "not_found") {
    return Response.json({ error: "コメントが見つかりません" }, { status: 404 });
  }
  if (result === "forbidden") {
    return Response.json({ error: "このコメントは削除できません" }, { status: 403 });
  }
  return new Response(null, { status: 204 });
}
