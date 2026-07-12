import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { login } from "@/lib/mock-db";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/login  モックログイン（ユーザー名のみで認証）
export async function POST(request: NextRequest) {
  const { username } = await request.json();
  if (!username) {
    return Response.json({ error: "ユーザー名が必要です" }, { status: 400 });
  }

  const result = login(username);
  if (!result) {
    return Response.json(
      { error: "ユーザーが見つかりません" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, result.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 本番では secure: true にする（モックのため省略）
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({ user: result.user });
}
