import { cookies } from "next/headers";
import { recordView } from "@/lib/mock-db";

const VIEWER_COOKIE = "gca_viewer";

// POST /api/clips/:id/view  再生を 1 回記録する（ログイン不要）
// 視聴者はログインの有無に関係なく匿名 ID の Cookie で区別し、
// 同じ人が短時間に見直した分は数えない（mock-db の VIEW_DEDUPE_MS）。
export async function POST(_request: Request, ctx: RouteContext<"/api/clips/[id]/view">) {
  const { id } = await ctx.params;
  const cookieStore = await cookies();
  let viewerKey = cookieStore.get(VIEWER_COOKIE)?.value;
  if (!viewerKey) {
    viewerKey = crypto.randomUUID();
    cookieStore.set(VIEWER_COOKIE, viewerKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const counted = recordView(id, viewerKey);
  if (counted === undefined) {
    return Response.json({ error: "クリップが見つかりません" }, { status: 404 });
  }
  return Response.json({ counted });
}
