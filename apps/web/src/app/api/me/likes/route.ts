import { getCurrentUser } from "@/lib/auth";
import { listLikedClips } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/me/likes  自分がいいねしたクリップ（要ログイン）
export async function GET(request: Request) {
  if (API_URL) return proxyToApi(request);
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  }
  return Response.json({ clips: listLikedClips(user.id) });
}
