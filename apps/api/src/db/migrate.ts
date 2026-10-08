// マイグレーションを適用する。コンテナ起動時と開発時に実行する。

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { config } from "../config";
import { createDb } from "./client";

const { db, sql } = createDb(config.databaseUrl);
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("migrations applied");
await sql.end();
