import { NextRequest } from "next/server";
import { addClip, getGameById, listClips } from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { MAX_UPLOAD_BYTES, VIDEO_EXTENSIONS } from "@/lib/config";
import { MAX_CLIP_DURATION_SEC } from "@/lib/types";

// GET /api/clips?game=<slug>&q=<検索語>
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clips = listClips({
    gameSlug: params.get("game") ?? undefined,
    query: params.get("q") ?? undefined,
  });
  return Response.json({ clips });
}

function badRequest(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

// POST /api/clips  クリップ投稿（要ログイン）
// multipart/form-data で受け取る:
//   video       動画ファイル（必須。mp4 / webm / mov、MAX_UPLOAD_MB 以下）
//   thumbnail   サムネイル画像（任意。ブラウザ側で動画から生成した JPEG）
//   title, description, gameId, durationSec
// 注意: request.formData() はファイル全体をメモリに読み込む。本番では署名付き URL で
// オブジェクトストレージへ直接アップロードする方式に切り替える（docs/architecture.md）。
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return badRequest("ログインが必要です", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("multipart/form-data で送信してください");
  }

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const gameId = String(form.get("gameId") ?? "");
  const duration = Math.round(Number(form.get("durationSec")));
  const video = form.get("video");
  const thumbnail = form.get("thumbnail");

  if (!title || !gameId) {
    return badRequest("タイトルとゲームは必須です");
  }
  if (!getGameById(gameId)) {
    return badRequest("存在しないゲームです");
  }
  if (!Number.isFinite(duration) || duration < 1) {
    return badRequest("動画の長さが不正です");
  }
  if (duration > MAX_CLIP_DURATION_SEC) {
    return badRequest(`動画の長さは最大${MAX_CLIP_DURATION_SEC}秒です`);
  }
  if (!(video instanceof File) || video.size === 0) {
    return badRequest("動画ファイルを選択してください");
  }
  const ext = VIDEO_EXTENSIONS[video.type];
  if (!ext) {
    return badRequest("対応していない動画形式です（mp4 / webm / mov）");
  }
  if (video.size > MAX_UPLOAD_BYTES) {
    return badRequest(
      `ファイルサイズは${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB以下にしてください`,
      413,
    );
  }

  const storage = getStorage();
  const id = crypto.randomUUID();
  const videoKey = `${id}/video${ext}`;
  const thumbKey = `${id}/thumb.jpg`;

  try {
    await storage.put(videoKey, video.stream());

    let thumbnailUrl: string;
    if (
      thumbnail instanceof File &&
      thumbnail.size > 0 &&
      thumbnail.type === "image/jpeg"
    ) {
      await storage.put(thumbKey, thumbnail.stream());
      thumbnailUrl = storage.publicUrl(thumbKey);
    } else {
      // サムネイルを生成できなかった場合はプレースホルダー画像を使う
      thumbnailUrl = `https://picsum.photos/seed/${id}/640/360`;
    }

    const clip = await addClip({
      id,
      title,
      description,
      gameId,
      durationSec: duration,
      videoUrl: storage.publicUrl(videoKey),
      thumbnailUrl,
      mimeType: video.type,
      sizeBytes: video.size,
      uploader: user,
    });
    return Response.json({ clip }, { status: 201 });
  } catch (err) {
    // 途中で失敗したら保存済みのファイルを残さない
    await storage.deletePrefix(id).catch(() => {});
    console.error("クリップの保存に失敗しました", err);
    return badRequest("クリップの保存に失敗しました", 500);
  }
}
