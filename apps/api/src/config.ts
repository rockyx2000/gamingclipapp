// 環境変数から設定を読む

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://gameclips:gameclips@localhost:5432/gameclips",
  /** セッション Cookie に Secure を付ける。HTTPS で配信するときは true にする */
  cookieSecure: process.env.COOKIE_SECURE === "true",
  /**
   * ユーザー名だけでログインできるデモログイン。パスワードの検証が無いので、
   * 本番では無効にする。開発（NODE_ENV が production 以外）では既定で有効、
   * production のイメージでは DEMO_LOGIN=true を明示したときだけ有効。
   */
  demoLogin: process.env.DEMO_LOGIN === "true" || process.env.NODE_ENV !== "production",
};

/** セッションの有効期間（秒）。Cookie の maxAge と DB 側の期限切れ判定に使う */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
