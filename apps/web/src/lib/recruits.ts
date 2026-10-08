// メンバー募集の読み取り。API_URL があれば apps/api から、無ければモックストアから読む。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import { API_URL } from "./config";
import * as mock from "./mock-db";
import type { RecruitWithGame } from "./types";

export async function listRecruits(gameSlug?: string): Promise<RecruitWithGame[]> {
  if (!API_URL) return mock.listRecruits(gameSlug);
  const qs = gameSlug ? `?game=${encodeURIComponent(gameSlug)}` : "";
  const { body } = await apiGet<{ recruits: RecruitWithGame[] }>(`/api/recruits${qs}`);
  return body.recruits;
}

export async function getRecruit(id: string): Promise<RecruitWithGame | undefined> {
  if (!API_URL) return mock.getRecruit(id);
  const { status, body } = await apiGet<{ recruit: RecruitWithGame }>(
    `/api/recruits/${encodeURIComponent(id)}`,
  );
  return status === 404 ? undefined : body.recruit;
}
