import path from "node:path";

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

/** 動画ファイルと永続化データの保存先ディレクトリ */
export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "data"));

/** アップロードした動画・サムネイルの保存先 */
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** アップロードできる動画ファイルの上限サイズ（バイト） */
export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 200) * 1024 * 1024;

/** アップロードできるサムネイル画像の上限サイズ（バイト） */
export const MAX_THUMBNAIL_BYTES = (Number(process.env.MAX_THUMBNAIL_MB) || 10) * 1024 * 1024;

/** 受け付ける動画の MIME タイプと保存時の拡張子 */
export const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

/** 受け付けるサムネイル画像の MIME タイプと保存時の拡張子 */
export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/** 配信時に拡張子から決める Content-Type */
export const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** セッションの有効期間（秒）。Cookie の maxAge と DB 側の期限切れ判定に使う */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;
