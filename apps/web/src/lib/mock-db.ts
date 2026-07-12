// インメモリのモックデータストア
// Route Handlers とサーバーコンポーネントの両方からこの層を経由してデータへアクセスする。
// 本物のバックエンド(apps/api)へ移行する際は、このファイルの関数実装を
// fetch ベースの実装に差し替えるだけで済む構造にしている。
// 注意: サーバー再起動でデータは初期状態に戻る（モックとして許容）。

import type {
  Clip,
  ClipType,
  ClipWithGame,
  Comment,
  Game,
  RecruitPost,
  RecruitWithGame,
  User,
} from "./types";

const VIDEO_BASE =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

const users: User[] = [
  {
    id: "u1",
    username: "sniper_taro",
    displayName: "スナイパー太郎",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "u2",
    username: "hanako_fps",
    displayName: "はなこ",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "u3",
    username: "midlane_king",
    displayName: "ミッドの王",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
  },
  {
    id: "u4",
    username: "builder_yu",
    displayName: "ゆう@建築勢",
    avatarUrl: "https://i.pravatar.cc/150?img=17",
  },
  {
    id: "u5",
    username: "ranked_grinder",
    displayName: "ランク中毒",
    avatarUrl: "https://i.pravatar.cc/150?img=52",
  },
];

const games: Game[] = [
  {
    id: "g1",
    slug: "valorant",
    name: "VALORANT",
    coverUrl: "https://picsum.photos/seed/valorant/640/360",
    description: "5v5のタクティカルシューター。エイムとアビリティの戦略が鍵。",
    clipCount: 0,
  },
  {
    id: "g2",
    slug: "apex-legends",
    name: "Apex Legends",
    coverUrl: "https://picsum.photos/seed/apex/640/360",
    description: "スピード感あふれるバトルロイヤルFPS。",
    clipCount: 0,
  },
  {
    id: "g3",
    slug: "splatoon-3",
    name: "スプラトゥーン3",
    coverUrl: "https://picsum.photos/seed/splatoon/640/360",
    description: "インクを塗り合う4v4アクションシューター。",
    clipCount: 0,
  },
  {
    id: "g4",
    slug: "fortnite",
    name: "Fortnite",
    coverUrl: "https://picsum.photos/seed/fortnite/640/360",
    description: "建築要素が特徴のバトルロイヤル。",
    clipCount: 0,
  },
  {
    id: "g5",
    slug: "street-fighter-6",
    name: "ストリートファイター6",
    coverUrl: "https://picsum.photos/seed/sf6/640/360",
    description: "世界中で愛される対戦格闘ゲームの最新作。",
    clipCount: 0,
  },
  {
    id: "g6",
    slug: "monster-hunter-wilds",
    name: "モンスターハンターワイルズ",
    coverUrl: "https://picsum.photos/seed/mhwilds/640/360",
    description: "大自然の中でモンスターを狩る協力アクション。",
    clipCount: 0,
  },
  {
    id: "g7",
    slug: "league-of-legends",
    name: "League of Legends",
    coverUrl: "https://picsum.photos/seed/lol/640/360",
    description: "世界最大級の5v5 MOBA。",
    clipCount: 0,
  },
];

const seedClips: Clip[] = [
  {
    id: "c1",
    title: "【VALORANT】1v5クラッチ！奇跡のエース",
    description: "ラウンド残り10秒からのまさかの逆転劇。最後のジェットの動きに注目。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip1/640/360",
    durationSec: 98,
    gameId: "g1",
    uploader: users[0],
    views: 15420,
    likes: 892,
    createdAt: "2026-07-08T12:30:00.000Z",
  },
  {
    id: "c2",
    title: "オペレーターで4連続ヘッドショット",
    description: "アセントBサイトでの守り。リピークのタイミングが完璧に噛み合った。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip2/360/640",
    durationSec: 15,
    gameId: "g1",
    uploader: users[1],
    views: 8930,
    likes: 445,
    createdAt: "2026-07-09T18:15:00.000Z",
  },
  {
    id: "c3",
    title: "【Apex】チャンピオンまでの最終ファイト全部見せます",
    description: "3部隊残りからの立ち回り。グレネードの使い方が勝負を分けた。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip3/640/360",
    durationSec: 115,
    gameId: "g2",
    uploader: users[4],
    views: 23100,
    likes: 1203,
    createdAt: "2026-07-07T09:00:00.000Z",
  },
  {
    id: "c4",
    title: "パスファインダーのグラップル神回避",
    description: "崖際での攻防。この移動は読めない。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip4/360/640",
    durationSec: 14,
    gameId: "g2",
    uploader: users[0],
    views: 5670,
    likes: 312,
    createdAt: "2026-07-10T21:45:00.000Z",
  },
  {
    id: "c5",
    title: "【スプラ3】ガチエリア残り10カウントからの大逆転",
    description: "ウルトラショットで打開してからのノックアウト勝ち。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip5/640/360",
    durationSec: 87,
    gameId: "g3",
    uploader: users[3],
    views: 12800,
    likes: 756,
    createdAt: "2026-07-06T15:20:00.000Z",
  },
  {
    id: "c6",
    title: "チャージャーの超遠距離スナイプ",
    description: "マップ端から端への一撃。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip6/360/640",
    durationSec: 12,
    gameId: "g3",
    uploader: users[1],
    views: 9450,
    likes: 523,
    createdAt: "2026-07-11T08:30:00.000Z",
  },
  {
    id: "c7",
    title: "【フォートナイト】ビクロイ確定の完璧な建築バトル",
    description: "最終円での1v1。ハイグラウンドの取り合いを制した。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip7/640/360",
    durationSec: 105,
    gameId: "g4",
    uploader: users[3],
    views: 31200,
    likes: 1876,
    createdAt: "2026-07-05T19:00:00.000Z",
  },
  {
    id: "c8",
    title: "0.5秒で完成する要塞建築",
    description: "指が見えない速さ。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip8/360/640",
    durationSec: 13,
    gameId: "g4",
    uploader: users[3],
    views: 45600,
    likes: 3210,
    createdAt: "2026-07-10T12:00:00.000Z",
  },
  {
    id: "c9",
    title: "【スト6】鬼のようなパリィからのフルコンボ",
    description: "ドライブインパクトの読み合いを完全制圧。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip9/640/360",
    durationSec: 45,
    gameId: "g5",
    uploader: users[2],
    views: 18900,
    likes: 1102,
    createdAt: "2026-07-09T22:10:00.000Z",
  },
  {
    id: "c10",
    title: "残り1ドットからの奇跡のSA3",
    description: "これがあるから格ゲーはやめられない。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip10/360/640",
    durationSec: 15,
    gameId: "g5",
    uploader: users[4],
    views: 27300,
    likes: 1987,
    createdAt: "2026-07-11T14:25:00.000Z",
  },
  {
    id: "c11",
    title: "【モンハンワイルズ】歴戦王を2分針で討伐",
    description: "太刀の見切り斬りが全部決まった神クエスト。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip11/640/360",
    durationSec: 119,
    gameId: "g6",
    uploader: users[0],
    views: 14500,
    likes: 834,
    createdAt: "2026-07-08T07:45:00.000Z",
  },
  {
    id: "c12",
    title: "大剣の真溜め斬りで空中のモンスターを撃墜",
    description: "タイミングが完璧すぎる一撃。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip12/360/640",
    durationSec: 11,
    gameId: "g6",
    uploader: users[2],
    views: 7890,
    likes: 456,
    createdAt: "2026-07-10T16:50:00.000Z",
  },
  {
    id: "c13",
    title: "【LoL】バロンスティールからの逆転勝利",
    description: "スマイトの完璧なタイミング。チームの連携も見事。",
    type: "clip",
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip13/640/360",
    durationSec: 92,
    gameId: "g7",
    uploader: users[2],
    views: 20100,
    likes: 1345,
    createdAt: "2026-07-07T20:30:00.000Z",
  },
  {
    id: "c14",
    title: "ペンタキルの瞬間",
    description: "全部持っていった。",
    type: "short",
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip14/360/640",
    durationSec: 15,
    gameId: "g7",
    uploader: users[4],
    views: 33400,
    likes: 2456,
    createdAt: "2026-07-11T19:05:00.000Z",
  },
];

const seedRecruits: RecruitPost[] = [
  {
    id: "r1",
    gameId: "g1",
    title: "【プラチナ帯】コンペ固定メンバー募集（あと2名）",
    body: "平日21時〜23時に活動しているチームです。イニシエーターとセンチネルを使える方を探しています。VCはDiscord必須。楽しく真剣にランクを上げたい方、ぜひコメントください。",
    author: users[0],
    positions: ["イニシエーター", "センチネル"],
    rank: "プラチナ〜ダイヤ",
    status: "open",
    createdAt: "2026-07-09T13:00:00.000Z",
    comments: [
      {
        id: "rc1",
        author: users[1],
        body: "プラチナ2のソーヴァ・キルジョイ使いです。時間帯もぴったりなので興味あります！",
        createdAt: "2026-07-09T14:30:00.000Z",
      },
      {
        id: "rc2",
        author: users[4],
        body: "VCは聞き専でも大丈夫ですか？",
        createdAt: "2026-07-09T16:45:00.000Z",
      },
    ],
  },
  {
    id: "r2",
    gameId: "g2",
    title: "ランクマ用デュオ・トリオ相手募集【ダイヤ帯】",
    body: "現在ダイヤ3です。IGLできる方だと嬉しいです。使用レジェンドは問いませんが、レイス・パスファインダーが得意です。",
    author: users[4],
    positions: ["IGL", "アタッカー"],
    rank: "ダイヤ帯",
    status: "open",
    createdAt: "2026-07-10T10:20:00.000Z",
    comments: [
      {
        id: "rc3",
        author: users[0],
        body: "ダイヤ4ですがIGL経験あります。今夜あたり一緒にどうですか？",
        createdAt: "2026-07-10T11:00:00.000Z",
      },
    ],
  },
  {
    id: "r3",
    gameId: "g3",
    title: "リグマメンバー募集！エンジョイ勢歓迎",
    body: "週末の夜にリーグマッチを楽しむグループです。ウデマエ不問、楽しくやれる方ならどなたでも。前衛ブキが少ないので特に歓迎します。",
    author: users[3],
    positions: ["前衛", "自由枠"],
    status: "open",
    createdAt: "2026-07-08T18:00:00.000Z",
    comments: [],
  },
  {
    id: "r4",
    gameId: "g5",
    title: "対戦相手・トレモ仲間募集【MR1500前後】",
    body: "ケン使いです。同じくらいのランク帯でカスタムルームを回せる方を探しています。金曜夜が中心です。",
    author: users[2],
    positions: ["対戦相手"],
    rank: "MR1400〜1600",
    status: "open",
    createdAt: "2026-07-11T09:30:00.000Z",
    comments: [
      {
        id: "rc4",
        author: users[1],
        body: "MR1450のジュリ使いです。金曜いけます！",
        createdAt: "2026-07-11T12:10:00.000Z",
      },
    ],
  },
  {
    id: "r5",
    gameId: "g7",
    title: "クラン戦向け5人チーム、サポート募集",
    body: "エメラルド帯中心のチームです。毎週日曜にクラン戦に出ています。エンチャンター系サポートを使える方を募集中。",
    author: users[2],
    positions: ["サポート"],
    rank: "エメラルド以上",
    status: "open",
    createdAt: "2026-07-06T20:00:00.000Z",
    comments: [],
  },
  {
    id: "r6",
    gameId: "g1",
    title: "【解決済み】アンレート気軽に回せる人",
    body: "メンバーが集まったためクローズします。ありがとうございました。",
    author: users[1],
    positions: ["自由枠"],
    status: "closed",
    createdAt: "2026-07-04T15:00:00.000Z",
    comments: [],
  },
];

// HMR やルート間でストアの実体を共有するため globalThis にキャッシュする
interface MockStore {
  clips: Clip[];
  recruits: RecruitPost[];
  /** sessionId -> userId */
  sessions: Map<string, string>;
}

const globalForStore = globalThis as unknown as { __mockStore?: MockStore };

function getStore(): MockStore {
  if (!globalForStore.__mockStore) {
    globalForStore.__mockStore = {
      clips: [...seedClips],
      recruits: seedRecruits.map((r) => ({ ...r, comments: [...r.comments] })),
      sessions: new Map(),
    };
  }
  return globalForStore.__mockStore;
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function withGame(clip: Clip): ClipWithGame {
  const game = games.find((g) => g.id === clip.gameId)!;
  return { ...clip, game };
}

function recruitWithGame(post: RecruitPost): RecruitWithGame {
  const game = games.find((g) => g.id === post.gameId)!;
  return { ...post, game };
}

// ---- ゲーム ----

export function listGames(query?: string): Game[] {
  const store = getStore();
  const counted = games.map((g) => ({
    ...g,
    clipCount: store.clips.filter((c) => c.gameId === g.id).length,
  }));
  if (!query) return counted;
  const q = query.toLowerCase();
  return counted.filter(
    (g) => g.name.toLowerCase().includes(q) || g.slug.includes(q),
  );
}

export function getGame(slug: string): Game | undefined {
  return listGames().find((g) => g.slug === slug);
}

// ---- クリップ ----

export interface ClipFilter {
  gameSlug?: string;
  type?: ClipType;
  query?: string;
}

export function listClips(filter: ClipFilter = {}): ClipWithGame[] {
  const store = getStore();
  let clips = [...store.clips];
  if (filter.gameSlug) {
    const game = games.find((g) => g.slug === filter.gameSlug);
    clips = game ? clips.filter((c) => c.gameId === game.id) : [];
  }
  if (filter.type) {
    clips = clips.filter((c) => c.type === filter.type);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    clips = clips.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }
  return clips.sort(byNewest).map(withGame);
}

export function getClip(id: string): ClipWithGame | undefined {
  const clip = getStore().clips.find((c) => c.id === id);
  return clip ? withGame(clip) : undefined;
}

export interface NewClipInput {
  title: string;
  description: string;
  type: ClipType;
  gameId: string;
  durationSec: number;
  uploader: User;
}

export function addClip(input: NewClipInput): ClipWithGame {
  const store = getStore();
  const isShort = input.type === "short";
  const clip: Clip = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    type: input.type,
    // モックのため、実ファイルの代わりにサンプル動画を割り当てる
    videoUrl: `${VIDEO_BASE}/${isShort ? "ForBiggerEscapes" : "ForBiggerFun"}.mp4`,
    thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/${isShort ? "360/640" : "640/360"}`,
    durationSec: input.durationSec,
    gameId: input.gameId,
    uploader: input.uploader,
    views: 0,
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  store.clips.push(clip);
  return withGame(clip);
}

// ---- メンバー募集 ----

export function listRecruits(gameSlug?: string): RecruitWithGame[] {
  const store = getStore();
  let posts = [...store.recruits];
  if (gameSlug) {
    const game = games.find((g) => g.slug === gameSlug);
    posts = game ? posts.filter((r) => r.gameId === game.id) : [];
  }
  return posts.sort(byNewest).map(recruitWithGame);
}

export function getRecruit(id: string): RecruitWithGame | undefined {
  const post = getStore().recruits.find((r) => r.id === id);
  return post ? recruitWithGame(post) : undefined;
}

export interface NewRecruitInput {
  gameId: string;
  title: string;
  body: string;
  positions: string[];
  rank?: string;
  author: User;
}

export function addRecruit(input: NewRecruitInput): RecruitWithGame {
  const store = getStore();
  const post: RecruitPost = {
    id: crypto.randomUUID(),
    gameId: input.gameId,
    title: input.title,
    body: input.body,
    author: input.author,
    positions: input.positions,
    rank: input.rank,
    status: "open",
    createdAt: new Date().toISOString(),
    comments: [],
  };
  store.recruits.push(post);
  return recruitWithGame(post);
}

export function addRecruitComment(
  recruitId: string,
  author: User,
  body: string,
): Comment | undefined {
  const post = getStore().recruits.find((r) => r.id === recruitId);
  if (!post) return undefined;
  const comment: Comment = {
    id: crypto.randomUUID(),
    author,
    body,
    createdAt: new Date().toISOString(),
  };
  post.comments.push(comment);
  return comment;
}

// ---- 認証（モック） ----
// ユーザー名だけでログインできる簡易実装。パスワードは検証しない。

export function listUsers(): User[] {
  return users;
}

export function login(username: string): { sessionId: string; user: User } | undefined {
  const user = users.find((u) => u.username === username);
  if (!user) return undefined;
  const sessionId = crypto.randomUUID();
  getStore().sessions.set(sessionId, user.id);
  return { sessionId, user };
}

export function logout(sessionId: string): void {
  getStore().sessions.delete(sessionId);
}

export function getSessionUser(sessionId: string | undefined): User | undefined {
  if (!sessionId) return undefined;
  const userId = getStore().sessions.get(sessionId);
  return users.find((u) => u.id === userId);
}
