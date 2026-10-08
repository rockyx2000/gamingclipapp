// コメント一覧のページング。新しい順で、(created_at, id) をカーソルにする。

import { and, eq, lt, or, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { COMMENTS_PAGE_SIZE } from "@gamingclipapp/shared";

export interface CommentCursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(c: { createdAt: Date; id: string }): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`).toString("base64url");
}

/** 壊れたカーソルは undefined（先頭から読む扱いにはせず、呼び出し側で 400 にする） */
export function decodeCursor(value: string): CommentCursor | undefined {
  const [iso, id] = Buffer.from(value, "base64url").toString().split("|");
  const createdAt = new Date(iso ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) return undefined;
  return { createdAt, id };
}

/** 1 ページの件数。指定が無い・不正なら既定、大きすぎれば既定の 5 倍で止める */
export function parseLimit(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return COMMENTS_PAGE_SIZE;
  return Math.min(n, COMMENTS_PAGE_SIZE * 5);
}

/** カーソルより古いものだけに絞る条件 */
export function beforeCursor(
  createdAt: PgColumn,
  id: PgColumn,
  cursor: CommentCursor | undefined,
): SQL | undefined {
  if (!cursor) return undefined;
  return or(lt(createdAt, cursor.createdAt), and(eq(createdAt, cursor.createdAt), lt(id, cursor.id)));
}
