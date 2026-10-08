// 環境変数から設定を読む

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://gameclips:gameclips@localhost:5432/gameclips",
};
