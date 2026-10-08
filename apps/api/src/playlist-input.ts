// プレイリスト API のリクエスト本文の検証。不正な値はメッセージ付きの 400 で弾く。

import type { Context } from "hono";
import type { PlaylistVisibility } from "@gamingclipapp/shared";
import { HttpError } from "./errors";
import { MAX_PLAYLIST_DESCRIPTION, MAX_PLAYLIST_TITLE } from "./limits";
import type { PlaylistPatch } from "./playlists";

const isVisibility = (v: unknown): v is PlaylistVisibility => v === "public" || v === "private";

function parseTitle(value: unknown): string {
  const title = typeof value === "string" ? value.trim() : "";
  if (!title) throw new HttpError("タイトルを入力してください", 400);
  if (title.length > MAX_PLAYLIST_TITLE) {
    throw new HttpError(`タイトルは${MAX_PLAYLIST_TITLE}文字以内にしてください`, 400);
  }
  return title;
}

function parseDescription(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new HttpError("説明が不正です", 400);
  const description = value.trim();
  if (description.length > MAX_PLAYLIST_DESCRIPTION) {
    throw new HttpError(`説明は${MAX_PLAYLIST_DESCRIPTION}文字以内にしてください`, 400);
  }
  return description;
}

export function parseCreateBody(body: Record<string, unknown>) {
  const visibility = body.visibility ?? "private";
  if (!isVisibility(visibility)) throw new HttpError("公開設定が不正です", 400);
  if (body.clipId !== undefined && typeof body.clipId !== "string") {
    throw new HttpError("クリップ ID が不正です", 400);
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
  if (body.description !== undefined) patch.description = parseDescription(body.description);
  if (body.visibility !== undefined) {
    if (!isVisibility(body.visibility)) throw new HttpError("公開設定が不正です", 400);
    patch.visibility = body.visibility;
  }
  if (body.clipIds !== undefined) {
    if (!Array.isArray(body.clipIds) || !body.clipIds.every((id) => typeof id === "string")) {
      throw new HttpError("並び順が不正です", 400);
    }
    patch.clipIds = body.clipIds;
  }
  return patch;
}

/** JSON 本文を読む。オブジェクトでなければ 400 */
export async function readJsonObject(c: Context): Promise<Record<string, unknown>> {
  const value: unknown = await c.req.json().catch(() => {
    throw new HttpError("JSON で送信してください", 400);
  });
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError("JSON オブジェクトで送信してください", 400);
  }
  return value as Record<string, unknown>;
}
