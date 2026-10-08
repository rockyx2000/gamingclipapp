// apps/api を呼ぶ共通の層。web のデータの読み書きはすべてここを通る。
// リクエストの Cookie（セッションと匿名の視聴者 ID）を api に引き継ぐので、
// サーバーコンポーネントと Route Handler のどちらからでも「いまのユーザーとして」呼べる。
// このファイルは next/headers を使うため、クライアントコンポーネントから import しないこと。

import { cookies } from "next/headers";
import { API_URL } from "./config";

export const SESSION_COOKIE = "gca_session";
export const VIEWER_COOKIE = "gca_viewer";

/** api に引き継ぐ Cookie */
const FORWARDED_COOKIES = [SESSION_COOKIE, VIEWER_COOKIE];

/** api を呼ぶ */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookieStore = await cookies();
  const cookie = FORWARDED_COOKIES.flatMap((name) => {
    const value = cookieStore.get(name)?.value;
    return value ? [`${name}=${value}`] : [];
  }).join("; ");
  if (cookie) headers.set("Cookie", cookie);
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

/** api のレスポンスから、そのままブラウザに返してよいヘッダーだけを写す */
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "content-disposition",
];

/**
 * Route Handler から api へそのまま転送する。リクエストとレスポンスの本文はストリームのまま流すので、
 * 動画のアップロードや Range 付きの配信も通る。ステータスと Set-Cookie も引き継ぐので、
 * ブラウザは今までどおり web の /api/... だけを見ていればよい。
 */
export async function proxyToApi(request: Request, path?: string): Promise<Response> {
  const url = new URL(request.url);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const headers = new Headers();
  for (const name of ["content-type", "range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const res = await apiFetch(path ?? `${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // ストリームを本文に渡すときに必要（Node の fetch）
    ...(hasBody && { duplex: "half" }),
  } as RequestInit);

  const out = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  for (const cookie of res.headers.getSetCookie()) out.append("Set-Cookie", cookie);
  return new Response(res.body, { status: res.status, headers: out });
}
