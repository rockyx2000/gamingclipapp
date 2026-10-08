"use client";

// ヘッダーの検索欄。入力に合わせて、ゲームとクリップの候補を出す（/api/search/suggest）。
// 候補を選ぶとそのゲーム・クリップへ、Enter だけならキーワード検索（/?q=）へ進む。
// キーボードは ↑↓ で候補を移動、Esc で閉じる。スマホ幅では、虫眼鏡で開く形（searchOpen）。

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import SearchIcon from "@mui/icons-material/Search";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import type { SearchSuggestions } from "@/lib/types";
import { colors } from "@/theme";
import { useDebouncedFetch } from "./useDebouncedFetch";

const NO_SUGGESTIONS: SearchSuggestions = { games: [], clips: [] };

interface Option {
  key: string;
  label: string;
  secondary?: string;
  href: string;
  kind: "game" | "clip";
}

interface Props {
  /** スマホ幅で検索欄を開いているか（PC 幅では常に出る） */
  searchOpen: boolean;
  onClose: () => void;
}

export function SearchBox({ searchOpen, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  // ポップアップの位置合わせ先。描画中に ref を読まないよう state で持つ
  const [anchor, setAnchor] = useState<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const { data } = useDebouncedFetch(
    focused && q ? `/api/search/suggest?q=${encodeURIComponent(q)}` : null,
    NO_SUGGESTIONS,
    200,
  );
  const options: Option[] = [
    ...data.games.map((g) => ({
      key: `g-${g.id}`,
      label: g.name,
      secondary: g.genre,
      href: `/games/${g.slug}`,
      kind: "game" as const,
    })),
    ...data.clips.map((c) => ({
      key: `c-${c.id}`,
      label: c.title,
      secondary: c.gameName,
      href: `/clips/${c.id}`,
      kind: "clip" as const,
    })),
  ];
  const open = focused && q !== "" && options.length > 0;
  const active = open && highlight >= 0 && highlight < options.length ? highlight : -1;

  const go = (href: string) => {
    setFocused(false);
    setHighlight(-1);
    inputRef.current?.blur();
    router.push(href);
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0) return go(options[active].href);
    go(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((active + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((active - 1 + options.length) % options.length);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  };

  const renderOption = (option: Option, index: number) => (
    <ListItemButton
      key={option.key}
      id={`search-option-${index}`}
      role="option"
      selected={index === active}
      aria-selected={index === active}
      // 入力欄からフォーカスを奪わない（blur で候補が消えて、クリックが届かなくなるのを防ぐ）
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => go(option.href)}
      dense
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        {option.kind === "game" ? (
          <SportsEsportsIcon fontSize="small" />
        ) : (
          <PlayCircleIcon fontSize="small" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={option.label}
        secondary={option.secondary}
        slotProps={{ primary: { noWrap: true, sx: { fontSize: 14 } }, secondary: { noWrap: true } }}
      />
    </ListItemButton>
  );

  const gameCount = data.games.length;

  return (
    <>
      <Box
        component="form"
        ref={setAnchor}
        onSubmit={handleSubmit}
        role="search"
        sx={{
          flexGrow: 1,
          maxWidth: 560,
          mx: "auto",
          display: { xs: searchOpen ? "flex" : "none", sm: "flex" },
          alignItems: "center",
          bgcolor: "background.paper",
          border: `1px solid ${colors.border}`,
          borderRadius: 1,
          px: 1.5,
          py: 0.25,
          "&:focus-within": { borderColor: colors.borderStrong },
        }}
      >
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="検索を閉じる"
          sx={{ display: { sm: "none" }, mr: 0.5 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <InputBase
          inputRef={inputRef}
          placeholder="クリップを検索"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(-1);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          sx={{ flexGrow: 1, fontSize: 14 }}
          autoComplete="off"
          autoFocus={searchOpen}
          inputProps={{
            "aria-label": "クリップを検索",
            role: "combobox",
            "aria-autocomplete": "list",
            "aria-expanded": open,
            "aria-controls": "search-suggestions",
            "aria-activedescendant": active >= 0 ? `search-option-${active}` : undefined,
          }}
        />
        <IconButton type="submit" size="small" aria-label="検索">
          <SearchIcon />
        </IconButton>
      </Box>
      <Popper
        open={open}
        anchorEl={anchor}
        placement="bottom-start"
        sx={{ zIndex: (t) => t.zIndex.drawer + 2, width: anchor?.clientWidth }}
      >
        <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 420, overflowY: "auto" }}>
          <List id="search-suggestions" role="listbox" disablePadding>
            {gameCount > 0 && <ListSubheader sx={{ lineHeight: "32px" }}>ゲーム</ListSubheader>}
            {options.slice(0, gameCount).map((o, i) => renderOption(o, i))}
            {data.clips.length > 0 && <ListSubheader sx={{ lineHeight: "32px" }}>クリップ</ListSubheader>}
            {options.slice(gameCount).map((o, i) => renderOption(o, gameCount + i))}
          </List>
        </Paper>
      </Popper>
    </>
  );
}
