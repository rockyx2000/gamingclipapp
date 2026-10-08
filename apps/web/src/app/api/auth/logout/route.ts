import { cookies } from "next/headers";
import { logout } from "@/lib/mock-db";
import { SESSION_COOKIE } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { proxyToApi } from "@/lib/api";

// POST /api/auth/logout
export async function POST(request: Request) {
  if (API_URL) return proxyToApi(request);
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    logout(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
  return Response.json({ ok: true });
}
