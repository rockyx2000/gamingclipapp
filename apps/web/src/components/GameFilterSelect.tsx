"use client";

// ランキング・急上昇・メンバー募集の「ゲームで絞り込む」セレクト
// 選ぶと ?game=<slug> を付け替えて再読み込みする（他のクエリは残す）。

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Game } from "@/lib/types";
import { gameMenuItems } from "./gameMenuItems";

interface Props {
  games: Game[];
  value: string;
}

export function GameFilterSelect({ games, value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("game", slug);
    else params.delete("game");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <TextField
      select
      size="small"
      label="ゲーム"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      sx={{ minWidth: 220 }}
    >
      <MenuItem value="">すべてのゲーム</MenuItem>
      {gameMenuItems(games, (g) => g.slug)}
    </TextField>
  );
}
