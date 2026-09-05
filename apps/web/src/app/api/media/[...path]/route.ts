import { getStorage, type ByteRange } from "@/lib/storage";

// GET /api/media/<clipId>/video.mp4  アップロードされた動画・サムネイルの配信
// <video> のシークに必要な Range リクエストに対応する。
// 本番でオブジェクトストレージ + CDN に移行したら、このルートは不要になる。

export const dynamic = "force-dynamic";

// "bytes=start-end" / "bytes=start-" / "bytes=-suffix" を解釈する
// 不正または範囲外なら null、Range 指定なしなら undefined を返す
function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  if (startStr === "" && endStr === "") return null;

  let start: number;
  let end: number;
  if (startStr === "") {
    // 末尾からの suffix 指定
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

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/media/[...path]">,
) {
  const { path } = await ctx.params;
  const key = path.join("/");
  const storage = getStorage();
  const info = await storage.head(key);
  if (!info) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": info.contentType,
    "Accept-Ranges": "bytes",
    // ブラウザに「保存」ではなく再生として扱わせる（ダウンロード自体を防ぐものではない）
    "Content-Disposition": "inline",
    // キーは UUID を含み内容が変わらないため長期キャッシュしてよい
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  const range = parseRange(request.headers.get("range"), info.size);
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
