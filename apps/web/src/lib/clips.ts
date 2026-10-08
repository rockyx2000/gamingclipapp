// クリップ・ランキング・いいね・コメント・プレイリストの読み取り（apps/api から）。
// api にはリクエストの Cookie を引き継ぐので、「いまのユーザー」の分は userId を渡さなくても返る。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import type {
  ClipWithGame,
  Comment,
  PlaylistWithClips,
  RankedClip,
  RankingPeriod,
} from "./types";

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export interface ClipFilter {
  gameSlug?: string;
  query?: string;
}

export async function listClips(filter: ClipFilter = {}): Promise<ClipWithGame[]> {
  const { body } = await apiGet<{ clips: ClipWithGame[] }>(
    `/api/clips${qs({ game: filter.gameSlug, q: filter.query })}`,
  );
  return body.clips;
}

export async function getClip(id: string): Promise<ClipWithGame | undefined> {
  const { status, body } = await apiGet<{ clip: ClipWithGame }>(`/api/clips/${encodeURIComponent(id)}`);
  return status === 404 ? undefined : body.clip;
}

/** 新しい順。クリップが無ければ undefined */
export async function listClipComments(clipId: string): Promise<Comment[] | undefined> {
  const { status, body } = await apiGet<{ comments: Comment[] }>(
    `/api/clips/${encodeURIComponent(clipId)}/comments`,
  );
  return status === 404 ? undefined : body.comments;
}

export interface RankingOptions {
  period: RankingPeriod;
  gameSlug?: string;
}

export async function listRanking(options: RankingOptions): Promise<RankedClip[]> {
  const { body } = await apiGet<{ clips: RankedClip[] }>(
    `/api/ranking${qs({ period: options.period, game: options.gameSlug })}`,
  );
  return body.clips;
}

export async function listTrending(
  options: { gameSlug?: string; limit?: number } = {},
): Promise<ClipWithGame[]> {
  const { body } = await apiGet<{ clips: ClipWithGame[] }>(
    `/api/trending${qs({ game: options.gameSlug })}`,
  );
  return options.limit ? body.clips.slice(0, options.limit) : body.clips;
}

/** ログインしているユーザーがいいねしたクリップ（いいねが新しい順） */
export async function listLikedClips(): Promise<ClipWithGame[]> {
  const { body } = await apiGet<{ clips: ClipWithGame[] }>("/api/me/likes");
  return body.clips;
}

/** clipIds のうち、ログインしているユーザーがいいねしているもの（フィード表示用） */
export async function likedClipIds(clipIds: string[]): Promise<string[]> {
  if (clipIds.length === 0) return [];
  const { body } = await apiGet<{ clipIds: string[] }>(
    `/api/me/liked-clip-ids?ids=${encodeURIComponent(clipIds.join(","))}`,
  );
  return body.clipIds;
}

/** ログインしているユーザーのプレイリスト */
export async function listMyPlaylists(): Promise<PlaylistWithClips[]> {
  const { body } = await apiGet<{ playlists: PlaylistWithClips[] }>("/api/playlists");
  return body.playlists;
}

/** 非公開のプレイリストは持ち主にだけ返す（api が Cookie のユーザーで判定する） */
export async function getPlaylist(id: string): Promise<PlaylistWithClips | undefined> {
  const { status, body } = await apiGet<{ playlist: PlaylistWithClips }>(
    `/api/playlists/${encodeURIComponent(id)}`,
  );
  return status === 404 ? undefined : body.playlist;
}
