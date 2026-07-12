import { cookies } from "next/headers";
import { logout } from "@/lib/mock-db";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    logout(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
  return Response.json({ ok: true });
}
