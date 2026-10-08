// メンバー募集の読み取り（apps/api から）
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { apiGet } from "./api";
import type { RecruitWithGame } from "./types";

export async function listRecruits(gameSlug?: string): Promise<RecruitWithGame[]> {
  const qs = gameSlug ? `?game=${encodeURIComponent(gameSlug)}` : "";
  const { body } = await apiGet<{ recruits: RecruitWithGame[] }>(`/api/recruits${qs}`);
  return body.recruits;
}

export async function getRecruit(id: string): Promise<RecruitWithGame | undefined> {
  const { status, body } = await apiGet<{ recruit: RecruitWithGame }>(
    `/api/recruits/${encodeURIComponent(id)}`,
  );
  return status === 404 ? undefined : body.recruit;
}
