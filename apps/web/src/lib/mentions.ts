// @メンションの表示用の分割。api が返す mentions（実在するユーザー）に含まれる @ユーザー名 だけを
// 強調する。実在しない @xxx や、メールアドレスの @ はただの文字のまま。
// ユーザー名の解釈は apps/api の mentions.ts と同じ規則にしてある。

import type { User } from "./types";

// 直前が英数字・_・@ の @ は拾わない
const MENTION_PATTERN = /(?<![A-Za-z0-9_@])@([A-Za-z0-9_]{1,30})/g;

export interface BodyPart {
  text: string;
  /** メンションなら、呼ばれたユーザー */
  mention?: User;
}

export function splitMentions(body: string, mentions: User[] = []): BodyPart[] {
  if (mentions.length === 0) return [{ text: body }];
  const byName = new Map(mentions.map((u) => [u.username.toLowerCase(), u]));
  const parts: BodyPart[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const user = byName.get(match[1].toLowerCase());
    if (!user) continue;
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: body.slice(last, start) });
    parts.push({ text: match[0], mention: user });
    last = start + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

/** キャレットの直前が書きかけの @メンションなら、その位置と検索語を返す */
export function activeMention(
  text: string,
  caret: number,
): { start: number; query: string } | undefined {
  const before = text.slice(0, caret);
  const match = /(?<![A-Za-z0-9_@])@([A-Za-z0-9_]{0,30})$/.exec(before);
  return match ? { start: match.index, query: match[1] } : undefined;
}
