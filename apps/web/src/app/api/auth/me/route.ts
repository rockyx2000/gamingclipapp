import { getCurrentUser } from "@/lib/auth";

// GET /api/auth/me  現在のログインユーザーを返す（未ログインなら user: null）
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user: user ?? null });
}
