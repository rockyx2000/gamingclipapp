// ゲームを選ぶセレクトの中身。26 タイトルを 1 列に並べると探しにくいので、
// ジャンルの見出し（ListSubheader）で区切って返す。
// MUI の Select は子要素を直接たどるため、コンポーネントではなく要素の配列を返す関数にしている。

import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import { GAME_GENRES, type Game } from "@/lib/types";

export function gameMenuItems(games: Game[], valueOf: (game: Game) => string) {
  return GAME_GENRES.flatMap((genre) => {
    const inGenre = games.filter((g) => g.genre === genre);
    if (inGenre.length === 0) return [];
    return [
      <ListSubheader key={`genre-${genre}`}>{genre}</ListSubheader>,
      ...inGenre.map((g) => (
        <MenuItem key={g.id} value={valueOf(g)}>
          {g.name}
        </MenuItem>
      )),
    ];
  });
}
