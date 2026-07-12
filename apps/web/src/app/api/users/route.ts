import { listUsers } from "@/lib/mock-db";

// GET /api/users  デモユーザー一覧（モックログイン用）
export async function GET() {
  return Response.json({ users: listUsers() });
}
