// サーバー側の設定値。環境変数で上書きできるようにし、ローカル / Docker / Kubernetes で切り替える。
// このファイルは Node.js の環境変数を読むため、クライアントコンポーネントから import しないこと。

/**
 * バックエンド（apps/api）のベース URL。web のデータの読み書きはすべてここへ回る。
 * 既定はホストで `npm run dev` するとき用（`docker compose up db api` で立てた api）。
 * compose では http://api:4000 を設定している。
 */
export const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
