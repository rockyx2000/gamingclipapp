// クリップ・ランキング・いいね・コメント・プレイリストの読み取り。
// API_URL があれば apps/api から、無ければモックストアから読む。
// 移行中の暫定の層で、モックを外したら mock-db の呼び出しごと不要になる。
// api にはリクエストの Cookie を引き継ぐので、「いまのユーザー」の分は userId を渡さなくても返る
// （モックのときだけ userId を使う）。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import { API_URL } from "./config";
import * as mock from "./mock-db";
import type {
  ClipWithGame,
  Comment,
  PlaylistWithClips,
  RankedClip,
} from "./types";

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function listClips(filter: mock.ClipFilter = {}): Promise<ClipWithGame[]> {
  if (!API_URL) return mock.listClips(filter);
  const { body } = await apiGet<{ clips: ClipWithGame[] }>(
    `/api/clips${qs({ game: filter.gameSlug, q: filter.query })}`,
  );
  return body.clips;
}

export async function getClip(id: string): Promise<ClipWithGame | undefined> {
  if (!API_URL) return mock.getClip(id);
  const { status, body } = await apiGet<{ clip: ClipWithGame }>(`/api/clips/${encodeURIComponent(id)}`);
  return status === 404 ? undefined : body.clip;
}

/** 新しい順。クリップが無ければ undefined */
export async function listClipComments(clipId: string): Promise<Comment[] | undefined> {
  if (!API_URL) return mock.listClipComments(clipId);
  const { status, body } = await apiGet<{ comments: Comment[] }>(
    `/api/clips/${encodeURIComponent(clipId)}/comments`,
  );
  return status === 404 ? undefined : body.comments;
}

export async function listRanking(options: mock.RankingOptions): Promise<RankedClip[]> {
  if (!API_URL) return mock.listRanking(options);
  const { body } = await apiGet<{ clips: RankedClip[] }>(
    `/api/ranking${qs({ period: options.period, game: options.gameSlug })}`,
  );
  // limit は api の既定（50）に任せる。web が指定するのはモックのときだけ
  return options.limit ? body.clips.slice(0, options.limit) : body.clips;
}

export async function listTrending(
  options: { gameSlug?: string; limit?: number } = {},
): Promise<ClipWithGame[]> {
  if (!API_URL) return mock.listTrending(options);
  const { body } = await apiGet<{ clips: ClipWithGame[] }>(
    `/api/trending${qs({ game: options.gameSlug })}`,
  );
  return options.limit ? body.clips.slice(0, options.limit) : body.clips;
}

/** ログインしているユーザーがいいねしたクリップ（いいねが新しい順） */
export async function listLikedClips(userId: string): Promise<ClipWithGame[]> {
  if (!API_URL) return mock.listLikedClips(userId);
  const { body } = await apiGet<{ clips: ClipWithGame[] }>("/api/me/likes");
  return body.clips;
}

/** clipIds のうち、ログインしているユーザーがいいねしているもの（フィード表示用） */
export async function likedClipIds(userId: string, clipIds: string[]): Promise<string[]> {
  if (!API_URL) return mock.likedClipIds(userId, clipIds);
  if (clipIds.length === 0) return [];
  const { body } = await apiGet<{ clipIds: string[] }>(
    `/api/me/liked-clip-ids?ids=${encodeURIComponent(clipIds.join(","))}`,
  );
  return body.clipIds;
}

export async function listPlaylistsByOwner(ownerId: string): Promise<PlaylistWithClips[]> {
  if (!API_URL) return mock.listPlaylistsByOwner(ownerId);
  const { body } = await apiGet<{ playlists: PlaylistWithClips[] }>("/api/playlists");
  return body.playlists;
}

/** 非公開のプレイリストは持ち主にだけ返す */
export async function getPlaylist(
  id: string,
  viewerId: string | undefined,
): Promise<PlaylistWithClips | undefined> {
  if (!API_URL) return mock.getPlaylist(id, viewerId);
  const { status, body } = await apiGet<{ playlist: PlaylistWithClips }>(
    `/api/playlists/${encodeURIComponent(id)}`,
  );
  return status === 404 ? undefined : body.playlist;
}
