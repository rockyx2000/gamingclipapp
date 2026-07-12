import { NextRequest } from "next/server";
import { addRecruitComment } from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/recruits/:id/comments  コメント投稿（要ログイン）
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/recruits/[id]/comments">,
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { body } = await request.json();
  if (!body || typeof body !== "string") {
    return Response.json({ error: "コメント本文が必要です" }, { status: 400 });
  }

  const comment = addRecruitComment(id, user, body);
  if (!comment) {
    return Response.json({ error: "募集が見つかりません" }, { status: 404 });
  }
  return Response.json({ comment }, { status: 201 });
}
