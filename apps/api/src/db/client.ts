import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>["db"];

export function createDb(url: string) {
  // 再実行時の「already exists, skipping」などの NOTICE はログに出さない
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  return { db, sql };
}
