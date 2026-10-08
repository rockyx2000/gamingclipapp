// アップロードされた動画・サムネイルの配信。<video> のシークに必要な Range リクエストに対応する。
// Cloudflare R2 + CDN に移したら、このルートは不要になる。

import type { Context } from "hono";
import { getStorage, type ByteRange } from "./storage";

// "bytes=start-end" / "bytes=start-" / "bytes=-suffix" を解釈する
// 不正または範囲外なら null、Range 指定なしなら undefined を返す
function parseRange(header: string | undefined, size: number): ByteRange | null | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return null;

  let start: number;
  let end: number;
  if (startStr === "") {
    const suffix = Number(endStr);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr === "" ? size - 1 : Math.min(Number(endStr), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

export async function serveMedia(c: Context, key: string): Promise<Response> {
  const storage = getStorage();
  const info = await storage.head(key);
  if (!info) return c.text("Not Found", 404);

  const headers = new Headers({
    "Content-Type": info.contentType,
    "Accept-Ranges": "bytes",
    // ブラウザに「保存」ではなく再生として扱わせる（ダウンロード自体を防ぐものではない）
    "Content-Disposition": "inline",
    // キーは UUID を含み内容が変わらないため長期キャッシュしてよい
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const range = parseRange(c.req.header("range"), info.size);
  if (range === null) {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(storage.read(key, range), { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(storage.read(key), { status: 200, headers });
}
