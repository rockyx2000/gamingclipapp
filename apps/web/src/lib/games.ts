// ゲームの読み取り。API_URL があれば apps/api から、無ければモックストアから読む。
// 移行中の暫定の層で、モックを外したら mock-db の呼び出しごと不要になる。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import { API_URL } from "./config";
import * as mock from "./mock-db";
import type { Game } from "./types";

export async function listGames(filter: mock.GameFilter = {}): Promise<Game[]> {
  if (!API_URL) return mock.listGames(filter);
  const params = new URLSearchParams();
  if (filter.query) params.set("q", filter.query);
  if (filter.genre) params.set("genre", filter.genre);
  const qs = params.toString();
  const { body } = await apiGet<{ games: Game[] }>(`/api/games${qs ? `?${qs}` : ""}`);
  return body.games;
}

export async function getGame(slug: string): Promise<Game | undefined> {
  if (!API_URL) return mock.getGame(slug);
  const { status, body } = await apiGet<{ game: Game }>(`/api/games/${encodeURIComponent(slug)}`);
  return status === 404 ? undefined : body.game;
}
