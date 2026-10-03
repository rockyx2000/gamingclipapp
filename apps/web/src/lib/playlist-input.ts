// プレイリスト API のリクエスト本文の検証
// Route Handler から使う。不正な値はメッセージ付きで弾き、mock-db には正しい形だけを渡す。

import {
  MAX_PLAYLIST_DESCRIPTION,
  MAX_PLAYLIST_TITLE,
  PlaylistError,
  type PlaylistPatch,
} from "./mock-db";
import type { PlaylistVisibility } from "./types";

function isVisibility(value: unknown): value is PlaylistVisibility {
  return value === "public" || value === "private";
}

function parseTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new PlaylistError("タイトルを入力してください", 400);
  if (title.length > MAX_PLAYLIST_TITLE) {
    throw new PlaylistError(`タイトルは${MAX_PLAYLIST_TITLE}文字以内にしてください`, 400);
  }
  return title;
}

function parseDescription(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new PlaylistError("説明が不正です", 400);
  const description = value.trim();
  if (description.length > MAX_PLAYLIST_DESCRIPTION) {
    throw new PlaylistError(
      `説明は${MAX_PLAYLIST_DESCRIPTION}文字以内にしてください`,
      400,
    );
  }
  return description;
}

export interface CreatePlaylistBody {
  title: string;
  description: string;
  visibility: PlaylistVisibility;
  clipId?: string;
}

export function parseCreateBody(body: Record<string, unknown>): CreatePlaylistBody {
  const visibility = body.visibility ?? "private";
  if (!isVisibility(visibility)) {
    throw new PlaylistError("公開設定が不正です", 400);
  }
  if (body.clipId !== undefined && typeof body.clipId !== "string") {
    throw new PlaylistError("クリップ ID が不正です", 400);
  }
  return {
    title: parseTitle(body.title),
    description: parseDescription(body.description),
    visibility,
    clipId: body.clipId,
  };
}

export function parsePatchBody(body: Record<string, unknown>): PlaylistPatch {
  const patch: PlaylistPatch = {};
  if (body.title !== undefined) patch.title = parseTitle(body.title);
  if (body.description !== undefined) {
    patch.description = parseDescription(body.description);
  }
  if (body.visibility !== undefined) {
    if (!isVisibility(body.visibility)) {
      throw new PlaylistError("公開設定が不正です", 400);
    }
    patch.visibility = body.visibility;
  }
  if (body.clipIds !== undefined) {
    if (
      !Array.isArray(body.clipIds) ||
      !body.clipIds.every((id) => typeof id === "string")
    ) {
      throw new PlaylistError("並び順が不正です", 400);
    }
    patch.clipIds = body.clipIds;
  }
  return patch;
}

/** JSON 本文を読む。オブジェクトでなければ 400 */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new PlaylistError("JSON で送信してください", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PlaylistError("JSON オブジェクトで送信してください", 400);
  }
  return body as Record<string, unknown>;
}

/** PlaylistError をレスポンスに変換する。それ以外の例外は投げ直す */
export function playlistErrorResponse(err: unknown): Response {
  if (err instanceof PlaylistError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  throw err;
}
