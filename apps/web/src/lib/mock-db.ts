// インメモリのモックデータストア
// Route Handlers とサーバーコンポーネントの両方からこの層を経由してデータへアクセスする。
// 本物のバックエンド(apps/api)へ移行する際は、このファイルの関数実装を
// fetch ベースの実装に差し替えるだけで済む構造にしている。
// 注意: 募集・セッションはサーバー再起動で初期状態に戻る（モックとして許容）。
// アップロードされたクリップのメタデータは DATA_DIR/clips.json に永続化し、
// 動画ファイル（ストレージ層）と整合が取れるようにしている。
// いいね・再生記録・プレイリストは DATA_DIR/social.json に永続化する。
// このファイルは Node.js の API を使うため、クライアントコンポーネントから import しないこと。

import { mkdirSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLIPS_FILE, SOCIAL_FILE } from "./config";
import type {
  Clip,
  ClipWithGame,
  Comment,
  Game,
  Playlist,
  PlaylistVisibility,
  PlaylistWithClips,
  RankedClip,
  RankingPeriod,
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

const seedClips: Clip[] = [
  {
    id: "c1",
    title: "【VALORANT】1v5クラッチ！奇跡のエース",
    description: "ラウンド残り10秒からのまさかの逆転劇。最後のジェットの動きに注目。",
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip1/640/360",
    durationSec: 58,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip2/640/360",
    durationSec: 22,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip3/640/360",
    durationSec: 55,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip4/640/360",
    durationSec: 18,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip5/640/360",
    durationSec: 47,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip6/640/360",
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
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip7/640/360",
    durationSec: 60,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip8/640/360",
    durationSec: 9,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip10/640/360",
    durationSec: 31,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip11/640/360",
    durationSec: 59,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip12/640/360",
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
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip13/640/360",
    durationSec: 52,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip14/640/360",
    durationSec: 27,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerMeltdowns.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip15/640/360",
    durationSec: 38,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip16/640/360",
    durationSec: 26,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerJoyrides.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip17/640/360",
    durationSec: 33,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerFun.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip18/640/360",
    durationSec: 19,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerEscapes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip19/640/360",
    durationSec: 57,
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
    videoUrl: `${VIDEO_BASE}/ForBiggerBlazes.mp4`,
    thumbnailUrl: "https://picsum.photos/seed/clip20/640/360",
    durationSec: 10,
    gameId: "g23",
    uploader: users[3],
    views: 52100,
    likes: 3880,
    createdAt: "2026-09-18T15:00:00.000Z",
  },
];

// social.json にコメントがまだ無いとき（初回）だけ入れる見本のコメント
const seedClipComments: Record<string, StoredClipComment[]> = {
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

// HMR やルート間でストアの実体を共有するため globalThis にキャッシュする。
// ストアの形を変えたら STORE_VERSION を上げる。dev サーバーを起動したままコードが
// 差し替わると古い形のストアが残り、新しい項目が undefined になるため、
// バージョンが違えば作り直す（ログイン中のセッションと募集は引き継ぐ）。
const STORE_VERSION = 3;

interface MockStore {
  version: number;
  /** シードデータ（コード内に定義、永続化しない） */
  seedClips: Clip[];
  /** ユーザーがアップロードしたクリップ（DATA_DIR/clips.json に永続化） */
  uploadedClips: Clip[];
  recruits: RecruitPost[];
  /** sessionId -> userId */
  sessions: Map<string, string>;
  /** clipId -> (userId -> いいねした時刻 ms) */
  likes: Map<string, Map<string, number>>;
  /** clipId -> 記録した再生の累計（シードの初期値は含まない） */
  viewTotals: Map<string, number>;
  /** clipId -> (時間バケット -> 再生数)。直近 VIEW_HISTORY_DAYS 日だけ保持する */
  viewBuckets: Map<string, Map<number, number>>;
  /**
   * シードクリップの再生履歴（ランキング・急上昇の見た目用に起動時に生成する）。
   * 永続化せず、viewBuckets とは別に持つ
   */
  seedViewBuckets: Map<string, Map<number, number>>;
  /** "viewerKey:clipId" -> 最後に再生を数えた時刻 ms（重複カウント防止） */
  recentViews: Map<string, number>;
  playlists: Playlist[];
  /** clipId -> コメント（投稿順） */
  clipComments: Map<string, StoredClipComment[]>;
}

/** 保存用のクリップコメント。投稿者は ID だけ持ち、表示時に User を引く */
interface StoredClipComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

const globalForStore = globalThis as unknown as { __mockStore?: MockStore };

function loadUploadedClips(): Clip[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(CLIPS_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Clip[]) : [];
  } catch {
    // ファイルが無い（初回起動）か壊れている場合は空から始める
    return [];
  }
}

async function saveUploadedClips(clips: Clip[]): Promise<void> {
  await mkdir(path.dirname(CLIPS_FILE), { recursive: true });
  await writeFile(CLIPS_FILE, JSON.stringify(clips, null, 2), "utf8");
}

// ---- いいね・再生記録・プレイリストの永続化 ----

const HOUR_MS = 60 * 60 * 1000;
/** 時間別の再生記録を残す日数（月間ランキングに足りる分） */
const VIEW_HISTORY_DAYS = 31;

function hourOf(ms: number): number {
  return Math.floor(ms / HOUR_MS);
}

interface SocialFile {
  version: 1;
  likes: { clipId: string; userId: string; at: string }[];
  viewTotals: Record<string, number>;
  /** clipId -> { 時間バケット: 再生数 } */
  viewBuckets: Record<string, Record<string, number>>;
  playlists: Playlist[];
  /** 無ければ（このキーが無い古いファイル・初回）見本のコメントから始める */
  clipComments?: Record<string, StoredClipComment[]>;
}

type SocialState = Pick<
  MockStore,
  "likes" | "viewTotals" | "viewBuckets" | "playlists" | "clipComments"
>;

function seedComments(): Map<string, StoredClipComment[]> {
  return new Map(
    Object.entries(seedClipComments).map(([clipId, list]) => [clipId, [...list]]),
  );
}

function loadSocial(): SocialState {
  const state: SocialState = {
    likes: new Map(),
    viewTotals: new Map(),
    viewBuckets: new Map(),
    playlists: [],
    clipComments: seedComments(),
  };
  let parsed: Partial<SocialFile>;
  try {
    parsed = JSON.parse(readFileSync(SOCIAL_FILE, "utf8"));
  } catch {
    return state;
  }
  if (parsed.clipComments) {
    state.clipComments = new Map(Object.entries(parsed.clipComments));
  }
  for (const like of parsed.likes ?? []) {
    let byUser = state.likes.get(like.clipId);
    if (!byUser) {
      byUser = new Map();
      state.likes.set(like.clipId, byUser);
    }
    byUser.set(like.userId, Date.parse(like.at));
  }
  for (const [clipId, total] of Object.entries(parsed.viewTotals ?? {})) {
    state.viewTotals.set(clipId, total);
  }
  for (const [clipId, buckets] of Object.entries(parsed.viewBuckets ?? {})) {
    state.viewBuckets.set(
      clipId,
      new Map(Object.entries(buckets).map(([h, n]) => [Number(h), n])),
    );
  }
  state.playlists = parsed.playlists ?? [];
  return state;
}

function toSocialFile(store: MockStore): SocialFile {
  const oldest = hourOf(Date.now()) - VIEW_HISTORY_DAYS * 24;
  const viewBuckets: SocialFile["viewBuckets"] = {};
  for (const [clipId, buckets] of store.viewBuckets) {
    const kept: Record<string, number> = {};
    for (const [hour, count] of buckets) {
      if (hour >= oldest) kept[hour] = count;
      else buckets.delete(hour);
    }
    viewBuckets[clipId] = kept;
  }
  return {
    version: 1,
    likes: [...store.likes].flatMap(([clipId, byUser]) =>
      [...byUser].map(([userId, at]) => ({
        clipId,
        userId,
        at: new Date(at).toISOString(),
      })),
    ),
    viewTotals: Object.fromEntries(store.viewTotals),
    viewBuckets,
    playlists: store.playlists,
    clipComments: Object.fromEntries(store.clipComments),
  };
}

// 書き込みは 1 本の Promise チェーンに並べ、同時に書いてファイルが壊れないようにする。
// 一時ファイルに書いてから rename するので、途中で落ちても前の内容が残る。
let socialWrite: Promise<void> = Promise.resolve();

function saveSocial(): Promise<void> {
  const store = getStore();
  socialWrite = socialWrite
    .catch(() => {})
    .then(async () => {
      const tmp = `${SOCIAL_FILE}.tmp`;
      await writeFile(tmp, JSON.stringify(toSocialFile(store)), "utf8");
      await rename(tmp, SOCIAL_FILE);
    });
  return socialWrite;
}

// 再生はリクエストのたびに書くと重いので、数秒まとめてから保存する
let viewSaveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleViewSave(): void {
  if (viewSaveTimer) return;
  viewSaveTimer = setTimeout(() => {
    viewSaveTimer = undefined;
    saveSocial().catch((err) => console.error("再生記録の保存に失敗しました", err));
  }, 5000);
}

/** clip.id から決まる疑似乱数（起動ごとに同じ履歴になるように） */
function seededRandom(seed: string): () => number {
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
function generateSeedViewHistory(clips: Clip[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  const nowHour = hourOf(Date.now());
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

function getStore(): MockStore {
  const previous = globalForStore.__mockStore;
  if (previous?.version !== STORE_VERSION) {
    mkdirSync(path.dirname(CLIPS_FILE), { recursive: true });
    globalForStore.__mockStore = {
      version: STORE_VERSION,
      seedClips: [...seedClips],
      uploadedClips: loadUploadedClips(),
      recruits:
        previous?.recruits ??
        seedRecruits.map((r) => ({ ...r, comments: [...r.comments] })),
      sessions: previous?.sessions ?? new Map(),
      ...loadSocial(),
      seedViewBuckets: generateSeedViewHistory(seedClips),
      recentViews: new Map(),
    };
  }
  return globalForStore.__mockStore!;
}

function allClips(store: MockStore): Clip[] {
  return [...store.seedClips, ...store.uploadedClips];
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt);
}

// views / likes は保存値に記録分を足した「現在の数」にして返す
function withGame(clip: Clip): ClipWithGame {
  const store = getStore();
  const game = games.find((g) => g.id === clip.gameId)!;
  return {
    ...clip,
    views: clip.views + (store.viewTotals.get(clip.id) ?? 0),
    likes: clip.likes + (store.likes.get(clip.id)?.size ?? 0),
    commentCount: store.clipComments.get(clip.id)?.length ?? 0,
    game,
  };
}

function recruitWithGame(post: RecruitPost): RecruitWithGame {
  const game = games.find((g) => g.id === post.gameId)!;
  return { ...post, game };
}

// ---- ゲーム ----

export interface GameFilter {
  query?: string;
  genre?: string;
}

export function listGames(filter: GameFilter = {}): Game[] {
  const store = getStore();
  let counted = games.map((g) => ({
    ...g,
    clipCount: allClips(store).filter((c) => c.gameId === g.id).length,
  }));
  if (filter.genre) {
    counted = counted.filter((g) => g.genre === filter.genre);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    counted = counted.filter(
      (g) => g.name.toLowerCase().includes(q) || g.slug.includes(q),
    );
  }
  return counted;
}

export function getGame(slug: string): Game | undefined {
  return listGames().find((g) => g.slug === slug);
}

export function getGameById(id: string): Game | undefined {
  return listGames().find((g) => g.id === id);
}

// ---- クリップ ----

export interface ClipFilter {
  gameSlug?: string;
  query?: string;
}

export function listClips(filter: ClipFilter = {}): ClipWithGame[] {
  let clips = allClips(getStore());
  if (filter.gameSlug) {
    const game = games.find((g) => g.slug === filter.gameSlug);
    clips = game ? clips.filter((c) => c.gameId === game.id) : [];
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
  const clip = allClips(getStore()).find((c) => c.id === id);
  return clip ? withGame(clip) : undefined;
}

export interface NewClipInput {
  /** ストレージのキーと揃えるため呼び出し側で採番する */
  id: string;
  title: string;
  description: string;
  gameId: string;
  durationSec: number;
  videoUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploader: User;
}

export async function addClip(input: NewClipInput): Promise<ClipWithGame> {
  const store = getStore();
  const clip: Clip = {
    id: input.id,
    title: input.title,
    description: input.description,
    videoUrl: input.videoUrl,
    thumbnailUrl: input.thumbnailUrl,
    durationSec: input.durationSec,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    gameId: input.gameId,
    uploader: input.uploader,
    views: 0,
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  store.uploadedClips.push(clip);
  await saveUploadedClips(store.uploadedClips);
  return withGame(clip);
}

// ---- いいね ----

export function isLiked(clipId: string, userId: string): boolean {
  return getStore().likes.get(clipId)?.has(userId) ?? false;
}

/** clipIds のうち userId がいいねしているものを返す（フィード表示用） */
export function likedClipIds(userId: string, clipIds: string[]): string[] {
  return clipIds.filter((id) => isLiked(id, userId));
}

/** いいねを付ける / 外す。冪等で、同じ操作を繰り返しても数は変わらない */
export async function setLike(
  clipId: string,
  userId: string,
  liked: boolean,
): Promise<{ liked: boolean; likes: number } | undefined> {
  const store = getStore();
  const clip = allClips(store).find((c) => c.id === clipId);
  if (!clip) return undefined;
  let byUser = store.likes.get(clipId);
  if (liked) {
    if (!byUser) {
      byUser = new Map();
      store.likes.set(clipId, byUser);
    }
    if (!byUser.has(userId)) byUser.set(userId, Date.now());
  } else {
    byUser?.delete(userId);
  }
  await saveSocial();
  return { liked, likes: withGame(clip).likes };
}

/** userId がいいねしたクリップ（いいねが新しい順） */
export function listLikedClips(userId: string): ClipWithGame[] {
  const store = getStore();
  return allClips(store)
    .map((clip) => ({ clip, at: store.likes.get(clip.id)?.get(userId) }))
    .filter((x): x is { clip: Clip; at: number } => x.at !== undefined)
    .sort((a, b) => b.at - a.at)
    .map((x) => withGame(x.clip));
}

// ---- クリップへのコメント ----

function resolveComment(stored: StoredClipComment): Comment | undefined {
  const author = users.find((u) => u.id === stored.authorId);
  return author
    ? { id: stored.id, author, body: stored.body, createdAt: stored.createdAt }
    : undefined;
}

/** 新しい順で返す。クリップが無ければ undefined */
export function listClipComments(clipId: string): Comment[] | undefined {
  const store = getStore();
  if (!allClips(store).some((c) => c.id === clipId)) return undefined;
  return (store.clipComments.get(clipId) ?? [])
    .map(resolveComment)
    .filter((c): c is Comment => c !== undefined)
    .reverse();
}

export async function addClipComment(
  clipId: string,
  author: User,
  body: string,
): Promise<Comment | undefined> {
  const store = getStore();
  if (!allClips(store).some((c) => c.id === clipId)) return undefined;
  const stored: StoredClipComment = {
    id: crypto.randomUUID(),
    authorId: author.id,
    body,
    createdAt: new Date().toISOString(),
  };
  let list = store.clipComments.get(clipId);
  if (!list) {
    list = [];
    store.clipComments.set(clipId, list);
  }
  list.push(stored);
  await saveSocial();
  return resolveComment(stored);
}

/** コメントを書いた本人か、クリップの投稿者なら削除できる */
export async function deleteClipComment(
  clipId: string,
  commentId: string,
  userId: string,
): Promise<"deleted" | "not_found" | "forbidden"> {
  const store = getStore();
  const clip = allClips(store).find((c) => c.id === clipId);
  const list = store.clipComments.get(clipId);
  const stored = list?.find((c) => c.id === commentId);
  if (!clip || !list || !stored) return "not_found";
  if (stored.authorId !== userId && clip.uploader.id !== userId) return "forbidden";
  store.clipComments.set(
    clipId,
    list.filter((c) => c !== stored),
  );
  await saveSocial();
  return "deleted";
}

// ---- 再生数 ----

/** 同じ視聴者が同じクリップを見直しても、この間隔内なら 1 回として数える */
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

/**
 * 再生を 1 回記録する。viewerKey はログイン有無に関係なく Cookie で振る匿名 ID。
 * 数えたら true、重複として無視したら false を返す。
 */
export function recordView(clipId: string, viewerKey: string): boolean | undefined {
  const store = getStore();
  if (!allClips(store).some((c) => c.id === clipId)) return undefined;
  const now = Date.now();
  const dedupeKey = `${viewerKey}:${clipId}`;
  const last = store.recentViews.get(dedupeKey);
  if (last !== undefined && now - last < VIEW_DEDUPE_MS) return false;
  store.recentViews.set(dedupeKey, now);
  // 重複判定用の記録が溜まり続けないよう、期限切れのものを時々捨てる
  if (store.recentViews.size > 10000) {
    for (const [key, at] of store.recentViews) {
      if (now - at >= VIEW_DEDUPE_MS) store.recentViews.delete(key);
    }
  }

  store.viewTotals.set(clipId, (store.viewTotals.get(clipId) ?? 0) + 1);
  let buckets = store.viewBuckets.get(clipId);
  if (!buckets) {
    buckets = new Map();
    store.viewBuckets.set(clipId, buckets);
  }
  const hour = hourOf(now);
  buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
  scheduleViewSave();
  return true;
}

/** sinceHour 以降の再生数（シードの履歴 + 記録分） */
function viewsSince(store: MockStore, clipId: string, sinceHour: number): number {
  let sum = 0;
  for (const source of [store.seedViewBuckets, store.viewBuckets]) {
    for (const [hour, count] of source.get(clipId) ?? []) {
      if (hour >= sinceHour) sum += count;
    }
  }
  return sum;
}

const PERIOD_HOURS: Record<Exclude<RankingPeriod, "all">, number> = {
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
};

export function isRankingPeriod(value: string): value is RankingPeriod {
  return value === "all" || value in PERIOD_HOURS;
}

export interface RankingOptions {
  period: RankingPeriod;
  gameSlug?: string;
  limit?: number;
}

/** 再生数ランキング。期間内に 1 回も再生されていないクリップは載せない */
export function listRanking({
  period,
  gameSlug,
  limit = 50,
}: RankingOptions): RankedClip[] {
  const store = getStore();
  const sinceHour =
    period === "all" ? undefined : hourOf(Date.now()) - PERIOD_HOURS[period] + 1;
  return listClips({ gameSlug })
    .map((clip) => ({
      clip,
      periodViews:
        sinceHour === undefined ? clip.views : viewsSince(store, clip.id, sinceHour),
    }))
    .filter((x) => x.periodViews > 0)
    .sort((a, b) => b.periodViews - a.periodViews || byNewest(a.clip, b.clip))
    .slice(0, limit)
    .map((x, i) => ({ ...x.clip, rank: i + 1, periodViews: x.periodViews }));
}

// ---- 急上昇 ----

/** 急上昇の対象にする時間幅 */
const TRENDING_WINDOW_HOURS = 48;
/** この時間が経つと勢いの重みが半分になる */
const TRENDING_HALF_LIFE_HOURS = 12;
/** いいね 1 件を再生何回ぶんとみなすか */
const TRENDING_LIKE_WEIGHT = 5;

function decay(ageHours: number): number {
  return Math.pow(0.5, ageHours / TRENDING_HALF_LIFE_HOURS);
}

/**
 * 直近 48 時間の再生といいねを、新しいほど重く数えたスコアで並べる。
 * 総再生数が多いだけの古いクリップより、いま伸びているクリップが上に来る。
 */
export function listTrending(options: { gameSlug?: string; limit?: number } = {}): ClipWithGame[] {
  const store = getStore();
  const nowHour = hourOf(Date.now());
  const sinceHour = nowHour - TRENDING_WINDOW_HOURS + 1;
  const now = Date.now();

  const scored = listClips({ gameSlug: options.gameSlug }).map((clip) => {
    let score = 0;
    for (const source of [store.seedViewBuckets, store.viewBuckets]) {
      for (const [hour, count] of source.get(clip.id) ?? []) {
        if (hour >= sinceHour) score += count * decay(nowHour - hour);
      }
    }
    for (const at of store.likes.get(clip.id)?.values() ?? []) {
      const ageHours = (now - at) / HOUR_MS;
      if (ageHours <= TRENDING_WINDOW_HOURS) {
        score += TRENDING_LIKE_WEIGHT * decay(ageHours);
      }
    }
    return { clip, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 50)
    .map((x) => x.clip);
}

// ---- プレイリスト ----

export const MAX_PLAYLISTS_PER_USER = 100;
export const MAX_CLIPS_PER_PLAYLIST = 500;
export const MAX_PLAYLIST_TITLE = 100;
export const MAX_PLAYLIST_DESCRIPTION = 1000;

function resolvePlaylist(playlist: Playlist): PlaylistWithClips {
  const store = getStore();
  const clips = allClips(store);
  const owner = users.find((u) => u.id === playlist.ownerId)!;
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    visibility: playlist.visibility,
    clipIds: playlist.clipIds,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    owner,
    clips: playlist.clipIds
      .map((id) => clips.find((c) => c.id === id))
      .filter((c): c is Clip => c !== undefined)
      .map(withGame),
  };
}

export function listPlaylistsByOwner(ownerId: string): PlaylistWithClips[] {
  return getStore()
    .playlists.filter((p) => p.ownerId === ownerId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(resolvePlaylist);
}

/** 非公開のプレイリストは持ち主にだけ返す */
export function getPlaylist(
  id: string,
  viewerId: string | undefined,
): PlaylistWithClips | undefined {
  const playlist = getStore().playlists.find((p) => p.id === id);
  if (!playlist) return undefined;
  if (playlist.visibility === "private" && playlist.ownerId !== viewerId) {
    return undefined;
  }
  return resolvePlaylist(playlist);
}

export class PlaylistError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function ownedPlaylist(id: string, ownerId: string): Playlist {
  const playlist = getStore().playlists.find((p) => p.id === id);
  // 他人の非公開プレイリストの存在を漏らさないよう、持ち主以外には 404 を返す
  if (!playlist || (playlist.ownerId !== ownerId && playlist.visibility === "private")) {
    throw new PlaylistError("プレイリストが見つかりません", 404);
  }
  if (playlist.ownerId !== ownerId) {
    throw new PlaylistError("このプレイリストは編集できません", 403);
  }
  return playlist;
}

export interface NewPlaylistInput {
  ownerId: string;
  title: string;
  description?: string;
  visibility: PlaylistVisibility;
  /** 作成と同時に入れるクリップ（視聴中の「保存」から作るとき） */
  clipId?: string;
}

export async function createPlaylist(input: NewPlaylistInput): Promise<PlaylistWithClips> {
  const store = getStore();
  if (store.playlists.filter((p) => p.ownerId === input.ownerId).length >= MAX_PLAYLISTS_PER_USER) {
    throw new PlaylistError(`プレイリストは${MAX_PLAYLISTS_PER_USER}個までです`, 400);
  }
  if (input.clipId && !allClips(store).some((c) => c.id === input.clipId)) {
    throw new PlaylistError("クリップが見つかりません", 404);
  }
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    title: input.title,
    description: input.description ?? "",
    visibility: input.visibility,
    clipIds: input.clipId ? [input.clipId] : [],
    createdAt: now,
    updatedAt: now,
  };
  store.playlists.push(playlist);
  await saveSocial();
  return resolvePlaylist(playlist);
}

export interface PlaylistPatch {
  title?: string;
  description?: string;
  visibility?: PlaylistVisibility;
  /** 並べ替え。今入っているクリップと同じ集合でなければならない */
  clipIds?: string[];
}

export async function updatePlaylist(
  id: string,
  ownerId: string,
  patch: PlaylistPatch,
): Promise<PlaylistWithClips> {
  const playlist = ownedPlaylist(id, ownerId);
  if (patch.clipIds) {
    const current = [...playlist.clipIds].sort().join(",");
    const next = [...patch.clipIds].sort().join(",");
    if (current !== next) {
      throw new PlaylistError("並べ替えでは追加・削除できません", 400);
    }
    playlist.clipIds = [...patch.clipIds];
  }
  if (patch.title !== undefined) playlist.title = patch.title;
  if (patch.description !== undefined) playlist.description = patch.description;
  if (patch.visibility !== undefined) playlist.visibility = patch.visibility;
  playlist.updatedAt = new Date().toISOString();
  await saveSocial();
  return resolvePlaylist(playlist);
}

export async function deletePlaylist(id: string, ownerId: string): Promise<void> {
  const playlist = ownedPlaylist(id, ownerId);
  const store = getStore();
  store.playlists = store.playlists.filter((p) => p !== playlist);
  await saveSocial();
}

export async function addClipToPlaylist(
  id: string,
  ownerId: string,
  clipId: string,
): Promise<PlaylistWithClips> {
  const playlist = ownedPlaylist(id, ownerId);
  if (!allClips(getStore()).some((c) => c.id === clipId)) {
    throw new PlaylistError("クリップが見つかりません", 404);
  }
  if (!playlist.clipIds.includes(clipId)) {
    if (playlist.clipIds.length >= MAX_CLIPS_PER_PLAYLIST) {
      throw new PlaylistError(
        `1つのプレイリストに入れられるのは${MAX_CLIPS_PER_PLAYLIST}本までです`,
        400,
      );
    }
    playlist.clipIds.push(clipId);
    playlist.updatedAt = new Date().toISOString();
    await saveSocial();
  }
  return resolvePlaylist(playlist);
}

export async function removeClipFromPlaylist(
  id: string,
  ownerId: string,
  clipId: string,
): Promise<PlaylistWithClips> {
  const playlist = ownedPlaylist(id, ownerId);
  if (playlist.clipIds.includes(clipId)) {
    playlist.clipIds = playlist.clipIds.filter((c) => c !== clipId);
    playlist.updatedAt = new Date().toISOString();
    await saveSocial();
  }
  return resolvePlaylist(playlist);
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
