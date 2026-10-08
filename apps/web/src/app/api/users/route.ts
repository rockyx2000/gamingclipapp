import { listUsers } from "@/lib/mock-db";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// GET /api/users  デモユーザー一覧（モックログイン用）
export async function GET(request: Request) {
  if (API_URL) return proxyToApi(request);
  return Response.json({ users: listUsers() });
}
