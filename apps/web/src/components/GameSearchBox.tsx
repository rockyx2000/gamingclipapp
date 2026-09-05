"use client";

// ゲーム一覧ページの検索フォーム

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Paper from "@mui/material/Paper";
import SearchIcon from "@mui/icons-material/Search";

export function GameSearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/games?q=${encodeURIComponent(q)}` : "/games");
  };

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={handleSubmit}
      sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.25 }}
    >
      <InputBase
        placeholder="ゲームを検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ fontSize: 14 }}
        inputProps={{ "aria-label": "ゲームを検索" }}
      />
      <IconButton type="submit" size="small" aria-label="検索">
        <SearchIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
}
