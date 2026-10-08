// 開発用のシードデータ。apps/web のモックストアと apps/api の DB シードが同じ内容を使う。

import type { Clip, Game, RecruitPost, User } from "./types";

/**
 * シードのクリップが使う動画。apps/api/seed-media/ にある短い動画（開発用に生成したもの）で、
 * api のシードが保存先（ClipStorage）の "seed/<名前>.mp4" へ置く。
 * 以前は外部のサンプル動画を使っていたが、配布元が 403 を返すようになったため置き換えた。
 */
export const SEED_VIDEO_SECONDS = {
  blazes: 8,
  escapes: 10,
  fun: 12,
  joyrides: 15,
  meltdowns: 20,
} as const;

export type SeedVideoName = keyof typeof SEED_VIDEO_SECONDS;

/** シードの動画の、保存先でのキー（api の /api/media/ 配下） */
export const seedVideoKey = (name: SeedVideoName) => `seed/${name}.mp4`;

const seedVideoUrl = (name: SeedVideoName) => `/api/media/${seedVideoKey(name)}`;

export const users: User[] = [
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

export const games: Game[] = [
  {
    id: "g1",
    slug: "valorant",
    name: "VALORANT",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/valorant/640/360",
    description: "5v5のタクティカルシューター。エイムとアビリティの戦略が鍵。",
    clipCount: 0,
  },
  {
    id: "g2",
    slug: "apex-legends",
    name: "Apex Legends",
    genre: "バトルロイヤル",
    coverUrl: "https://picsum.photos/seed/apex/640/360",
    description: "スピード感あふれるバトルロイヤルFPS。",
    clipCount: 0,
  },
  {
    id: "g3",
    slug: "splatoon-3",
    name: "スプラトゥーン3",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/splatoon/640/360",
    description: "インクを塗り合う4v4アクションシューター。",
    clipCount: 0,
  },
  {
    id: "g4",
    slug: "fortnite",
    name: "Fortnite",
    genre: "バトルロイヤル",
    coverUrl: "https://picsum.photos/seed/fortnite/640/360",
    description: "建築要素が特徴のバトルロイヤル。",
    clipCount: 0,
  },
  {
    id: "g5",
    slug: "street-fighter-6",
    name: "ストリートファイター6",
    genre: "格闘",
    coverUrl: "https://picsum.photos/seed/sf6/640/360",
    description: "世界中で愛される対戦格闘ゲームの最新作。",
    clipCount: 0,
  },
  {
    id: "g6",
    slug: "monster-hunter-wilds",
    name: "モンスターハンターワイルズ",
    genre: "アクション",
    coverUrl: "https://picsum.photos/seed/mhwilds/640/360",
    description: "大自然の中でモンスターを狩る協力アクション。",
    clipCount: 0,
  },
  {
    id: "g7",
    slug: "league-of-legends",
    name: "League of Legends",
    genre: "MOBA",
    coverUrl: "https://picsum.photos/seed/lol/640/360",
    description: "世界最大級の5v5 MOBA。",
    clipCount: 0,
  },
  {
    id: "g8",
    slug: "overwatch-2",
    name: "Overwatch 2",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/overwatch2/640/360",
    description: "ヒーローの能力を組み合わせて戦う5v5チームシューター。",
    clipCount: 0,
  },
  {
    id: "g9",
    slug: "counter-strike-2",
    name: "Counter-Strike 2",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/cs2/640/360",
    description: "爆破ルールの元祖。撃ち合いと投げ物の精度が勝負を決める。",
    clipCount: 0,
  },
  {
    id: "g10",
    slug: "rainbow-six-siege",
    name: "レインボーシックス シージ",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/r6s/640/360",
    description: "壁を壊して攻め込む、破壊と情報戦のタクティカルシューター。",
    clipCount: 0,
  },
  {
    id: "g11",
    slug: "marvel-rivals",
    name: "Marvel Rivals",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/marvelrivals/640/360",
    description: "マーベルのヒーローで戦う6v6のチームシューター。",
    clipCount: 0,
  },
  {
    id: "g12",
    slug: "pubg",
    name: "PUBG: BATTLEGROUNDS",
    genre: "バトルロイヤル",
    coverUrl: "https://picsum.photos/seed/pubg/640/360",
    description: "100人で最後の1部隊を目指すバトルロイヤルの代表作。",
    clipCount: 0,
  },
  {
    id: "g13",
    slug: "call-of-duty-warzone",
    name: "Call of Duty: Warzone",
    genre: "バトルロイヤル",
    coverUrl: "https://picsum.photos/seed/warzone/640/360",
    description: "大規模マップで戦う Call of Duty のバトルロイヤル。",
    clipCount: 0,
  },
  {
    id: "g14",
    slug: "tekken-8",
    name: "鉄拳8",
    genre: "格闘",
    coverUrl: "https://picsum.photos/seed/tekken8/640/360",
    description: "ヒート システムで攻め続ける3D対戦格闘。",
    clipCount: 0,
  },
  {
    id: "g15",
    slug: "smash-bros-ultimate",
    name: "大乱闘スマッシュブラザーズ SPECIAL",
    genre: "格闘",
    coverUrl: "https://picsum.photos/seed/smash/640/360",
    description: "歴代キャラクターが集結する対戦アクション。",
    clipCount: 0,
  },
  {
    id: "g16",
    slug: "dota-2",
    name: "Dota 2",
    genre: "MOBA",
    coverUrl: "https://picsum.photos/seed/dota2/640/360",
    description: "奥深い戦略性で知られる5v5 MOBA。",
    clipCount: 0,
  },
  {
    id: "g17",
    slug: "pokemon-unite",
    name: "ポケモンユナイト",
    genre: "MOBA",
    coverUrl: "https://picsum.photos/seed/unite/640/360",
    description: "ポケモンで戦う5v5のチーム戦略バトル。",
    clipCount: 0,
  },
  {
    id: "g18",
    slug: "elden-ring-nightreign",
    name: "ELDEN RING NIGHTREIGN",
    genre: "アクション",
    coverUrl: "https://picsum.photos/seed/nightreign/640/360",
    description: "3人で夜の王に挑む協力型サバイバルアクション。",
    clipCount: 0,
  },
  {
    id: "g19",
    slug: "escape-from-tarkov",
    name: "Escape from Tarkov",
    genre: "FPS・TPS",
    coverUrl: "https://picsum.photos/seed/tarkov/640/360",
    description: "持ち込んだ装備を失うリスクと戦うハードコアFPS。",
    clipCount: 0,
  },
  {
    id: "g20",
    slug: "rocket-league",
    name: "Rocket League",
    genre: "レース・スポーツ",
    coverUrl: "https://picsum.photos/seed/rocketleague/640/360",
    description: "車でボールを蹴るカーサッカー。空中戦の魅せプレイが華。",
    clipCount: 0,
  },
  {
    id: "g21",
    slug: "mario-kart-world",
    name: "マリオカート ワールド",
    genre: "レース・スポーツ",
    coverUrl: "https://picsum.photos/seed/mkworld/640/360",
    description: "つながった世界を走り抜けるマリオカート。",
    clipCount: 0,
  },
  {
    id: "g22",
    slug: "ea-sports-fc",
    name: "EA SPORTS FC",
    genre: "レース・スポーツ",
    coverUrl: "https://picsum.photos/seed/easfc/640/360",
    description: "世界中のクラブと選手で戦うサッカーゲーム。",
    clipCount: 0,
  },
  {
    id: "g23",
    slug: "minecraft",
    name: "Minecraft",
    genre: "サンドボックス",
    coverUrl: "https://picsum.photos/seed/minecraft/640/360",
    description: "建築も PvP も自由自在なサンドボックス。",
    clipCount: 0,
  },
  {
    id: "g24",
    slug: "genshin-impact",
    name: "原神",
    genre: "RPG",
    coverUrl: "https://picsum.photos/seed/genshin/640/360",
    description: "広大な世界を冒険するオープンワールドRPG。",
    clipCount: 0,
  },
  {
    id: "g25",
    slug: "honkai-star-rail",
    name: "崩壊：スターレイル",
    genre: "RPG",
    coverUrl: "https://picsum.photos/seed/starrail/640/360",
    description: "銀河を旅するスペースファンタジーRPG。",
    clipCount: 0,
  },
  {
    id: "g26",
    slug: "fall-guys",
    name: "Fall Guys",
    genre: "パーティー",
    coverUrl: "https://picsum.photos/seed/fallguys/640/360",
    description: "障害物レースで最後の1人を目指すパーティーゲーム。",
    clipCount: 0,
  },
];

export const seedClips: Clip[] = [
  {
    id: "c1",
    title: "【VALORANT】1v5クラッチ！奇跡のエース",
    description: "ラウンド残り10秒からのまさかの逆転劇。最後のジェットの動きに注目。",
    videoUrl: seedVideoUrl("blazes"),
    thumbnailUrl: "https://picsum.photos/seed/clip1/640/360",
    durationSec: SEED_VIDEO_SECONDS.blazes,
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
    videoUrl: seedVideoUrl("escapes"),
    thumbnailUrl: "https://picsum.photos/seed/clip2/640/360",
    durationSec: SEED_VIDEO_SECONDS.escapes,
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
    videoUrl: seedVideoUrl("fun"),
    thumbnailUrl: "https://picsum.photos/seed/clip3/640/360",
    durationSec: SEED_VIDEO_SECONDS.fun,
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
    videoUrl: seedVideoUrl("joyrides"),
    thumbnailUrl: "https://picsum.photos/seed/clip4/640/360",
    durationSec: SEED_VIDEO_SECONDS.joyrides,
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
    videoUrl: seedVideoUrl("meltdowns"),
    thumbnailUrl: "https://picsum.photos/seed/clip5/640/360",
    durationSec: SEED_VIDEO_SECONDS.meltdowns,
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
    videoUrl: seedVideoUrl("blazes"),
    thumbnailUrl: "https://picsum.photos/seed/clip6/640/360",
    durationSec: SEED_VIDEO_SECONDS.blazes,
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
    videoUrl: seedVideoUrl("escapes"),
    thumbnailUrl: "https://picsum.photos/seed/clip7/640/360",
    durationSec: SEED_VIDEO_SECONDS.escapes,
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
    videoUrl: seedVideoUrl("fun"),
    thumbnailUrl: "https://picsum.photos/seed/clip8/640/360",
    durationSec: SEED_VIDEO_SECONDS.fun,
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
    videoUrl: seedVideoUrl("joyrides"),
    thumbnailUrl: "https://picsum.photos/seed/clip9/640/360",
    durationSec: SEED_VIDEO_SECONDS.joyrides,
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
    videoUrl: seedVideoUrl("meltdowns"),
    thumbnailUrl: "https://picsum.photos/seed/clip10/640/360",
    durationSec: SEED_VIDEO_SECONDS.meltdowns,
    gameId: "g5",
    uploader: users[4],
    views: 27300,
    likes: 1987,
    createdAt: "2026-07-11T14:25:00.000Z",
  },
  {
    id: "c11",
    title: "【モンハンワイルズ】歴戦王をダウンから一気に討伐",
    description: "太刀の見切り斬りが全部決まった神クエスト。",
    videoUrl: seedVideoUrl("blazes"),
    thumbnailUrl: "https://picsum.photos/seed/clip11/640/360",
    durationSec: SEED_VIDEO_SECONDS.blazes,
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
    videoUrl: seedVideoUrl("escapes"),
    thumbnailUrl: "https://picsum.photos/seed/clip12/640/360",
    durationSec: SEED_VIDEO_SECONDS.escapes,
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
    videoUrl: seedVideoUrl("fun"),
    thumbnailUrl: "https://picsum.photos/seed/clip13/640/360",
    durationSec: SEED_VIDEO_SECONDS.fun,
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
    videoUrl: seedVideoUrl("joyrides"),
    thumbnailUrl: "https://picsum.photos/seed/clip14/640/360",
    durationSec: SEED_VIDEO_SECONDS.joyrides,
    gameId: "g7",
    uploader: users[4],
    views: 33400,
    likes: 2456,
    createdAt: "2026-07-11T19:05:00.000Z",
  },
  {
    id: "c15",
    title: "【OW2】アナのスリープで敵のウルトを全部止めた",
    description: "ナノブーストを合わせてからの一掃。サポートでも試合は動かせる。",
    videoUrl: seedVideoUrl("meltdowns"),
    thumbnailUrl: "https://picsum.photos/seed/clip15/640/360",
    durationSec: SEED_VIDEO_SECONDS.meltdowns,
    gameId: "g8",
    uploader: users[1],
    views: 11200,
    likes: 640,
    createdAt: "2026-09-21T13:40:00.000Z",
  },
  {
    id: "c16",
    title: "【CS2】AWP で 1 発ずつ 4 キル、ラウンドを取り切る",
    description: "ミラージュの A サイト。スモーク明けの一瞬を逃さない。",
    videoUrl: seedVideoUrl("blazes"),
    thumbnailUrl: "https://picsum.photos/seed/clip16/640/360",
    durationSec: SEED_VIDEO_SECONDS.blazes,
    gameId: "g9",
    uploader: users[0],
    views: 19800,
    likes: 1310,
    createdAt: "2026-09-26T22:05:00.000Z",
  },
  {
    id: "c17",
    title: "【鉄拳8】ヒートスマッシュで残り 1 ドットを削り切る",
    description: "最終ラウンド、タイムアップ寸前の差し返し。",
    videoUrl: seedVideoUrl("joyrides"),
    thumbnailUrl: "https://picsum.photos/seed/clip17/640/360",
    durationSec: SEED_VIDEO_SECONDS.joyrides,
    gameId: "g14",
    uploader: users[2],
    views: 6400,
    likes: 388,
    createdAt: "2026-09-29T11:20:00.000Z",
  },
  {
    id: "c18",
    title: "【Rocket League】天井リセットからのフリップリセットゴール",
    description: "練習 3 か月、ついに試合で決まった。",
    videoUrl: seedVideoUrl("fun"),
    thumbnailUrl: "https://picsum.photos/seed/clip18/640/360",
    durationSec: SEED_VIDEO_SECONDS.fun,
    gameId: "g20",
    uploader: users[4],
    views: 24600,
    likes: 2104,
    createdAt: "2026-10-01T18:30:00.000Z",
  },
  {
    id: "c19",
    title: "【マリカワールド】最下位から 1 位までごぼう抜き",
    description: "サンダーとトゲゾーをすべてかわしてゴール直前で逆転。",
    videoUrl: seedVideoUrl("escapes"),
    thumbnailUrl: "https://picsum.photos/seed/clip19/640/360",
    durationSec: SEED_VIDEO_SECONDS.escapes,
    gameId: "g21",
    uploader: users[3],
    views: 15300,
    likes: 970,
    createdAt: "2026-09-30T09:10:00.000Z",
  },
  {
    id: "c20",
    title: "【マイクラ】10 秒で完成する水バケツ着地",
    description: "高さ 200 ブロックからの MLG。",
    videoUrl: seedVideoUrl("blazes"),
    thumbnailUrl: "https://picsum.photos/seed/clip20/640/360",
    durationSec: SEED_VIDEO_SECONDS.blazes,
    gameId: "g23",
    uploader: users[3],
    views: 52100,
    likes: 3880,
    createdAt: "2026-09-18T15:00:00.000Z",
  },
];

/** シードのクリップコメント。投稿者は ID だけ持つ */
export interface SeedClipComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

// social.json にコメントがまだ無いとき（初回）だけ入れる見本のコメント
export const seedClipComments: Record<string, SeedClipComment[]> = {
  c1: [
    { id: "cc1", authorId: "u2", body: "最後のダッシュからの切り返しえぐい", createdAt: "2026-07-08T13:05:00.000Z" },
    { id: "cc2", authorId: "u5", body: "これ味方視点で見たら泣く", createdAt: "2026-07-08T15:40:00.000Z" },
  ],
  c3: [
    { id: "cc3", authorId: "u1", body: "グレの投げ込み位置、真似させてもらいます", createdAt: "2026-07-07T11:20:00.000Z" },
  ],
  c8: [
    { id: "cc4", authorId: "u5", body: "0.5秒は盛ってると思ったらほんとに0.5秒だった", createdAt: "2026-07-10T13:00:00.000Z" },
    { id: "cc5", authorId: "u3", body: "キー配置教えてほしい", createdAt: "2026-07-10T14:30:00.000Z" },
  ],
  c14: [
    { id: "cc6", authorId: "u1", body: "最後のフラッシュの判断が完璧", createdAt: "2026-07-11T20:10:00.000Z" },
  ],
  c18: [
    { id: "cc7", authorId: "u4", body: "試合で決めたのすごすぎる", createdAt: "2026-10-01T19:00:00.000Z" },
  ],
};

export const seedRecruits: RecruitPost[] = [
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

/** clip.id から決まる疑似乱数（起動ごとに同じ履歴になるように） */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h ^= h + Math.imul(h ^ (h >>> 7), 61 | h);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

// シードクリップに直近 30 日の再生履歴を作る。どれか 1 日に山（バズった日）を置き、
// 一部のクリップは山を直近 2 日に置くことで、急上昇と総合ランキングの顔ぶれが変わるようにする。
/** 返すのは clipId -> { 時間バケット（エポックからの時間）: 再生数 } */
export function generateSeedViewHistory(
  clips: Clip[],
  nowMs: number = Date.now(),
): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  const nowHour = Math.floor(nowMs / (60 * 60 * 1000));
  for (const clip of clips) {
    const rand = seededRandom(clip.id);
    const buckets = new Map<number, number>();
    const spikeDay = rand() < 0.35 ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 28);
    const spikeScale = 4 + rand() * 6;
    for (let day = 0; day < 30; day++) {
      let perDay = clip.views * 0.004 * (0.3 + rand() * 1.4);
      if (day === spikeDay) perDay *= spikeScale;
      const perHour = Math.round(perDay / 24);
      if (perHour === 0) continue;
      for (let h = 0; h < 24; h++) {
        const hour = nowHour - day * 24 - h;
        buckets.set(hour, perHour + Math.floor(rand() * 3));
      }
    }
    result.set(clip.id, buckets);
  }
  return result;
}
