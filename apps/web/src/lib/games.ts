// ゲームの読み取り（apps/api から）
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import type { Game } from "./types";

export interface GameFilter {
  query?: string;
  genre?: string;
}

export async function listGames(filter: GameFilter = {}): Promise<Game[]> {
  const params = new URLSearchParams();
  if (filter.query) params.set("q", filter.query);
  if (filter.genre) params.set("genre", filter.genre);
  const qs = params.toString();
  const { body } = await apiGet<{ games: Game[] }>(`/api/games${qs ? `?${qs}` : ""}`);
  return body.games;
}

export async function getGame(slug: string): Promise<Game | undefined> {
  const { status, body } = await apiGet<{ game: Game }>(`/api/games/${encodeURIComponent(slug)}`);
  return status === 404 ? undefined : body.game;
}
