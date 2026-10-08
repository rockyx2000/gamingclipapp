// ゲームの読み取り。API_URL があれば apps/api から、無ければモックストアから読む。
// 移行中の暫定の層で、クリップを api に移したら mock-db の呼び出しごと不要になる。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import { API_URL } from "./config";
import * as mock from "./mock-db";
import type { Game } from "./types";

// クリップはまだ web のモックストア（アップロード分を含む）が持っているので、
// 件数は api の値ではなくモック側の数を使う。api に移したら api の値をそのまま使う。
function withMockClipCounts(games: Game[]): Game[] {
  const counts = new Map(mock.listGames().map((g) => [g.id, g.clipCount]));
  return games.map((g) => ({ ...g, clipCount: counts.get(g.id) ?? 0 }));
}

export async function listGames(filter: mock.GameFilter = {}): Promise<Game[]> {
  if (!API_URL) return mock.listGames(filter);
  const params = new URLSearchParams();
  if (filter.query) params.set("q", filter.query);
  if (filter.genre) params.set("genre", filter.genre);
  const qs = params.toString();
  const { body } = await apiGet<{ games: Game[] }>(`/api/games${qs ? `?${qs}` : ""}`);
  return withMockClipCounts(body.games);
}

export async function getGame(slug: string): Promise<Game | undefined> {
  if (!API_URL) return mock.getGame(slug);
  const { status, body } = await apiGet<{ game: Game }>(`/api/games/${encodeURIComponent(slug)}`);
  return status === 404 ? undefined : withMockClipCounts([body.game])[0];
}
