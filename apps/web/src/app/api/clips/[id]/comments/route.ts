import { getCurrentUser } from "@/lib/auth";
import { addClipComment, listClipComments } from "@/lib/mock-db";
import { MAX_CLIP_COMMENT_LENGTH } from "@/lib/types";

// GET /api/clips/:id/comments  コメント一覧（新しい順、ログイン不要）
export async function GET(_request: Request, ctx: RouteContext<"/api/clips/[id]/comments">) {
  const { id } = await ctx.params;
  const comments = listClipComments(id);
  if (!comments) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json({ comments });
}

// POST /api/clips/:id/comments  { body } でコメントする（要ログイン）
export async function POST(request: Request, ctx: RouteContext<"/api/clips/[id]/comments">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON で送信してください" }, { status: 400 });
  }
  const raw = (payload as { body?: unknown } | null)?.body;
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) {
    return Response.json({ error: "コメントを入力してください" }, { status: 400 });
  }
  if (body.length > MAX_CLIP_COMMENT_LENGTH) {
    return Response.json(
      { error: `コメントは${MAX_CLIP_COMMENT_LENGTH}文字以内にしてください` },
      { status: 400 },
    );
  }
  const { id } = await ctx.params;
  const comment = await addClipComment(id, user, body);
  if (!comment) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json({ comment }, { status: 201 });
}
