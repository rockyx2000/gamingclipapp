// サーバー側の設定値。環境変数で上書きできるようにし、
// ローカル / Docker / Kubernetes で保存先を切り替えられるようにする。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import path from "node:path";

/** 動画ファイルと永続化データの保存先ディレクトリ */
export const DATA_DIR = path.resolve(
  process.env.DATA_DIR ?? path.join(process.cwd(), "data"),
);

/** アップロードした動画・サムネイルの保存先 */
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** 投稿したクリップのメタデータを保存する JSON ファイル */
export const CLIPS_FILE = path.join(DATA_DIR, "clips.json");

/** アップロードできる動画ファイルの上限サイズ（バイト） */
export const MAX_UPLOAD_BYTES =
  (Number(process.env.MAX_UPLOAD_MB) || 200) * 1024 * 1024;

/** 受け付ける動画の MIME タイプと保存時の拡張子 */
export const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
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
