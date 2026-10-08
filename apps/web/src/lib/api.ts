// apps/api を呼ぶ共通の層。API_URL があるときだけ使う。
// リクエストの gca_session Cookie を api に引き継ぐので、サーバーコンポーネントと
// Route Handler のどちらからでも「いまのユーザーとして」呼べる。
// このファイルは next/headers を使うため、クライアントコンポーネントから import しないこと。

import { cookies } from "next/headers";
import { API_URL } from "./config";

export const SESSION_COOKIE = "gca_session";

/** api を呼ぶ。API_URL が無いときに呼ぶのはプログラムの誤りなので例外にする */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_URL) throw new Error("API_URL が設定されていません");
  const headers = new Headers(init.headers);
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (sessionId) headers.set("Cookie", `${SESSION_COOKIE}=${sessionId}`);
  return fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store", redirect: "manual" });
}

/** 読み取り用。404 は呼び出し側が扱えるよう、そのまま返す。それ以外の失敗は例外にする */
export async function apiGet<T>(path: string): Promise<{ status: number; body: T }> {
  const res = await apiFetch(path);
  if (res.status !== 404 && !res.ok) {
    throw new Error(`api ${path} が ${res.status} を返しました`);
  }
  return { status: res.status, body: (await res.json()) as T };
}

/**
 * Route Handler から api へそのまま転送する。ボディ・ステータス・Set-Cookie を引き継ぐので、
 * ブラウザは今までどおり web の /api/... だけを見ていればよい。
 */
export async function proxyToApi(request: Request, path?: string): Promise<Response> {
  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const res = await apiFetch(path ?? `${url.pathname}${url.search}`, {
    method: request.method,
    headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" },
    body: hasBody ? await request.text() : undefined,
  });
  const headers = new Headers({ "Content-Type": res.headers.get("content-type") ?? "application/json" });
  for (const cookie of res.headers.getSetCookie()) headers.append("Set-Cookie", cookie);
  return new Response(await res.text(), { status: res.status, headers });
}
