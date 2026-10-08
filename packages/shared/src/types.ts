// ドメイン型定義
// 将来バックエンド(apps/api)と共有する場合は packages/shared へ移動する

/** クリップの最大長（秒）。1 分以内のクリップ共有サイトという方針に合わせる */
export const MAX_CLIP_DURATION_SEC = 60;

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

/** ゲームのジャンル。ゲーム一覧の絞り込みと投稿画面のグループ分けに使う */
export const GAME_GENRES = [
  "FPS・TPS",
  "バトルロイヤル",
  "格闘",
  "MOBA",
  "アクション",
  "レース・スポーツ",
  "サンドボックス",
  "RPG",
  "パーティー",
] as const;

export type GameGenre = (typeof GAME_GENRES)[number];

export interface Game {
  id: string;
  slug: string;
  name: string;
  genre: GameGenre;
  coverUrl: string;
  description: string;
  clipCount: number;
}

export interface Clip {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  /** 秒。MAX_CLIP_DURATION_SEC 以下 */
  durationSec: number;
  /** アップロードされた動画の MIME タイプ（サンプル動画のシードには無い） */
  mimeType?: string;
  /** アップロードされた動画のファイルサイズ（バイト） */
  sizeBytes?: number;
  gameId: string;
  uploader: User;
  /** 総再生数。保存値（シードの初期値）に、記録した再生を足して返す */
  views: number;
  /** 総いいね数。保存値（シードの初期値）に、ユーザーのいいねを足して返す */
  likes: number;
  createdAt: string;
  /** 映っているユーザー（投稿者がタグ付けしたもの）。詳細（GET /api/clips/:id）だけが返す */
  tags?: User[];
}

export interface Comment {
  id: string;
  author: User;
  body: string;
  createdAt: string;
  /** 本文の @ユーザー名 で呼ばれたユーザー（実在するものだけ。api が返す） */
  mentions?: User[];
}

/** ユーザー名の形式。@メンションとタグ付けの検索・解釈に使う */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{1,30}$/;

/** 1 つのコメントで呼べるユーザー数の上限 */
export const MAX_MENTIONS_PER_COMMENT = 10;

/** 1 つのクリップにタグ付けできるユーザー数の上限 */
export const MAX_CLIP_TAGS = 10;

/** コメントの一覧は、このページ単位で読む */
export const COMMENTS_PAGE_SIZE = 20;

/** コメントの一覧のレスポンス。nextCursor が null なら最後まで読んだ */
export interface CommentPage {
  comments: Comment[];
  nextCursor: string | null;
}

/** 検索サジェスト（ヘッダーの検索欄） */
export interface SearchSuggestions {
  games: Pick<Game, "id" | "slug" | "name" | "genre">[];
  clips: { id: string; title: string; gameName: string }[];
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

export type PlaylistVisibility = "public" | "private";

export interface Playlist {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  /** public は URL を知っていれば誰でも見られる。private は本人だけ */
  visibility: PlaylistVisibility;
  /** 再生順に並んだクリップ ID */
  clipIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** ランキングの集計期間 */
export type RankingPeriod = "day" | "week" | "month" | "all";

// API レスポンス用の複合型
export interface ClipWithGame extends Clip {
  game: Game;
  commentCount: number;
}

/** クリップへのコメント本文の上限（文字数） */
export const MAX_CLIP_COMMENT_LENGTH = 500;

export interface RecruitWithGame extends RecruitPost {
  game: Game;
}

export interface PlaylistWithClips extends Omit<Playlist, "ownerId"> {
  owner: User;
  /** 削除されたクリップは除いて返す */
  clips: ClipWithGame[];
}

export interface RankedClip extends ClipWithGame {
  /** 1 始まりの順位 */
  rank: number;
  /** 集計期間内の再生数（period が all のときは総再生数） */
  periodViews: number;
}
