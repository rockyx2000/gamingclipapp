// プレイリストの読み取り

import { asc, desc, eq, inArray } from "drizzle-orm";
import type { PlaylistVisibility, PlaylistWithClips } from "@gamingclipapp/shared";
import type { Db } from "./db/client";
import { playlistClips, playlists, users } from "./db/schema";
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
