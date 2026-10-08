// プレイリストの読み取り

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { PlaylistVisibility, PlaylistWithClips } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { clips, playlistClips, playlists, users } from "./db/schema";
import { HttpError } from "./errors";
import {
  MAX_CLIPS_PER_PLAYLIST,
  MAX_PLAYLISTS_PER_USER,
} from "./limits";
import { listClipsByIds } from "./queries";

const playlistSelect = {
  id: playlists.id,
  title: playlists.title,
  description: playlists.description,
  visibility: playlists.visibility,
  createdAt: playlists.createdAt,
  updatedAt: playlists.updatedAt,
  owner: {
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
  },
};

type PlaylistRow = {
  id: string;
  title: string;
  description: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
  owner: PlaylistWithClips["owner"];
};

// 複数のプレイリストの中身をまとめて引く（クリップの取得が 1 回で済むように）
async function resolvePlaylists(db: Db, rows: PlaylistRow[]): Promise<PlaylistWithClips[]> {
  if (rows.length === 0) return [];
  const members = await db
    .select({ playlistId: playlistClips.playlistId, clipId: playlistClips.clipId })
    .from(playlistClips)
    .where(
      inArray(
        playlistClips.playlistId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(playlistClips.playlistId), asc(playlistClips.position));
  const clips = await listClipsByIds(db, [...new Set(members.map((m) => m.clipId))]);
  const clipById = new Map(clips.map((c) => [c.id, c]));

  return rows.map((row) => {
    const clipIds = members.filter((m) => m.playlistId === row.id).map((m) => m.clipId);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      visibility: row.visibility as PlaylistVisibility,
      clipIds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      owner: row.owner,
      clips: clipIds.flatMap((id) => clipById.get(id) ?? []),
    };
  });
}

export async function listPlaylistsByOwner(db: Db, ownerId: string): Promise<PlaylistWithClips[]> {
  const rows = await db
    .select(playlistSelect)
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.ownerId, ownerId))
    .orderBy(desc(playlists.updatedAt), desc(playlists.id));
  return resolvePlaylists(db, rows);
}

/** 非公開のプレイリストは持ち主にだけ返す（他人には存在も漏らさない） */
export async function getPlaylist(
  db: Db,
  id: string,
  viewerId: string | undefined,
): Promise<PlaylistWithClips | undefined> {
  const [row] = await db
    .select({ ...playlistSelect, ownerId: playlists.ownerId })
    .from(playlists)
    .innerJoin(users, eq(playlists.ownerId, users.id))
    .where(eq(playlists.id, id));
  if (!row) return undefined;
  if (row.visibility === "private" && row.ownerId !== viewerId) return undefined;
  const [playlist] = await resolvePlaylists(db, [row]);
  return playlist;
}

// ---- 書き込み ----

/** 自分のプレイリストを取る。他人の非公開は存在を漏らさず 404、他人の公開は 403 */
async function ownedPlaylist(db: Db, id: string, ownerId: string) {
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
  if (!playlist || (playlist.ownerId !== ownerId && playlist.visibility === "private")) {
    throw new HttpError("プレイリストが見つかりません", 404);
  }
  if (playlist.ownerId !== ownerId) throw new HttpError("このプレイリストは編集できません", 403);
  return playlist;
}

async function resolved(db: Db, id: string, ownerId: string): Promise<PlaylistWithClips> {
  const playlist = await getPlaylist(db, id, ownerId);
  if (!playlist) throw new HttpError("プレイリストが見つかりません", 404);
  return playlist;
}

export interface NewPlaylistInput {
  ownerId: string;
  title: string;
  description: string;
  visibility: PlaylistVisibility;
  /** 作成と同時に入れるクリップ（視聴中の「保存」から作るとき） */
  clipId?: string;
}

export async function createPlaylist(db: Db, input: NewPlaylistInput): Promise<PlaylistWithClips> {
  const [owned] = await db
    .select({ n: count() })
    .from(playlists)
    .where(eq(playlists.ownerId, input.ownerId));
  if ((owned?.n ?? 0) >= MAX_PLAYLISTS_PER_USER) {
    throw new HttpError(`プレイリストは${MAX_PLAYLISTS_PER_USER}個までです`, 400);
  }
  if (input.clipId) {
    const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, input.clipId));
    if (!clip) throw new HttpError("クリップが見つかりません", 404);
  }
  const id = crypto.randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(playlists).values({
      id,
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      visibility: input.visibility,
      createdAt: now,
      updatedAt: now,
    });
    if (input.clipId) {
      await tx.insert(playlistClips).values({ playlistId: id, clipId: input.clipId, position: 0 });
    }
  });
  return resolved(db, id, input.ownerId);
}

export interface PlaylistPatch {
  title?: string;
  description?: string;
  visibility?: PlaylistVisibility;
  /** 並べ替え。今入っているクリップと同じ集合でなければならない */
  clipIds?: string[];
}

export async function updatePlaylist(
  db: Db,
  id: string,
  ownerId: string,
  patch: PlaylistPatch,
): Promise<PlaylistWithClips> {
  await ownedPlaylist(db, id, ownerId);
  await db.transaction(async (tx) => {
    if (patch.clipIds) {
      const current = await tx
        .select({ clipId: playlistClips.clipId })
        .from(playlistClips)
        .where(eq(playlistClips.playlistId, id));
      const a = current.map((r) => r.clipId).sort().join(",");
      const b = [...patch.clipIds].sort().join(",");
      if (a !== b) throw new HttpError("並べ替えでは追加・削除できません", 400);
      for (const [position, clipId] of patch.clipIds.entries()) {
        await tx
          .update(playlistClips)
          .set({ position })
          .where(and(eq(playlistClips.playlistId, id), eq(playlistClips.clipId, clipId)));
      }
    }
    await tx
      .update(playlists)
      .set({
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.visibility !== undefined && { visibility: patch.visibility }),
        updatedAt: new Date(),
      })
      .where(eq(playlists.id, id));
  });
  return resolved(db, id, ownerId);
}

export async function deletePlaylist(db: Db, id: string, ownerId: string): Promise<void> {
  await ownedPlaylist(db, id, ownerId);
  await db.delete(playlists).where(eq(playlists.id, id));
}

/** 末尾に追加する。追加済みなら何もしない */
export async function addClipToPlaylist(
  db: Db,
  id: string,
  ownerId: string,
  clipId: string,
): Promise<PlaylistWithClips> {
  await ownedPlaylist(db, id, ownerId);
  const [clip] = await db.select({ id: clips.id }).from(clips).where(eq(clips.id, clipId));
  if (!clip) throw new HttpError("クリップが見つかりません", 404);
  await db.transaction(async (tx) => {
    const members = await tx
      .select({ clipId: playlistClips.clipId, position: playlistClips.position })
      .from(playlistClips)
      .where(eq(playlistClips.playlistId, id));
    if (members.some((m) => m.clipId === clipId)) return;
    if (members.length >= MAX_CLIPS_PER_PLAYLIST) {
      throw new HttpError(`1つのプレイリストに入れられるのは${MAX_CLIPS_PER_PLAYLIST}本までです`, 400);
    }
    const next = members.reduce((max, m) => Math.max(max, m.position), -1) + 1;
    await tx
      .insert(playlistClips)
      .values({ playlistId: id, clipId, position: next })
      .onConflictDoNothing();
    await tx.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, id));
  });
  return resolved(db, id, ownerId);
}

export async function removeClipFromPlaylist(
  db: Db,
  id: string,
  ownerId: string,
  clipId: string,
): Promise<PlaylistWithClips> {
  await ownedPlaylist(db, id, ownerId);
  const removed = await db
    .delete(playlistClips)
    .where(and(eq(playlistClips.playlistId, id), eq(playlistClips.clipId, clipId)))
    .returning({ clipId: playlistClips.clipId });
  if (removed.length > 0) {
    await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, id));
  }
  return resolved(db, id, ownerId);
}
