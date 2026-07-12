// ドメイン型定義
// 将来バックエンド(apps/api)と共有する場合は packages/shared へ移動する

export type ClipType = "clip" | "short";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  coverUrl: string;
  description: string;
  clipCount: number;
}

export interface Clip {
  id: string;
  title: string;
  description: string;
  type: ClipType;
  videoUrl: string;
  thumbnailUrl: string;
  /** clip は最大 120 秒、short は 15 秒程度 */
  durationSec: number;
  gameId: string;
  uploader: User;
  views: number;
  likes: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  author: User;
  body: string;
  createdAt: string;
}

export type RecruitStatus = "open" | "closed";

export interface RecruitPost {
  id: string;
  gameId: string;
  title: string;
  body: string;
  author: User;
  /** 募集ポジション（例: デュエリスト、サポート） */
  positions: string[];
  /** ランク帯などの条件（任意） */
  rank?: string;
  status: RecruitStatus;
  createdAt: string;
  comments: Comment[];
}

// API レスポンス用の複合型
export interface ClipWithGame extends Clip {
  game: Game;
}

export interface RecruitWithGame extends RecruitPost {
  game: Game;
}
