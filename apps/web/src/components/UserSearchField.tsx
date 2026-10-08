"use client";

// ユーザーを 1 人検索して選ぶ入力欄（タグ付けで、映像のクリックした位置に付ける人を選ぶ用）。
// 候補は /api/users/search（要ログイン）から取る。選んだら onSelect が呼ばれる。

import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { User } from "@/lib/types";
import { useDebouncedFetch } from "./useDebouncedFetch";

const NO_USERS: { users: User[] } = { users: [] };

interface Props {
  onSelect: (user: User) => void;
  /** 候補に出さないユーザー（自分自身や、すでにタグ付けした人） */
  excludeIds: string[];
  autoFocus?: boolean;
}

export function UserSearchField({ onSelect, excludeIds, autoFocus }: Props) {
  const [input, setInput] = useState("");
  const { data, loading } = useDebouncedFetch(
    `/api/users/search?q=${encodeURIComponent(input.trim())}`,
    NO_USERS,
    150,
  );
  const options = data.users.filter((u) => !excludeIds.includes(u.id));

  return (
    <Autocomplete
      // 選んだら入力欄は空に戻す（選択済みの値は親が持つ）
      value={null}
      onChange={(_, user) => user && onSelect(user)}
      inputValue={input}
      onInputChange={(_, next) => setInput(next)}
      options={options}
      loading={loading}
      loadingText="検索中…"
      noOptionsText="該当するユーザーがいません"
      openOnFocus
      // 絞り込みは api 側で済んでいる
      filterOptions={(x) => x}
      getOptionLabel={(user) => user.displayName}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      size="small"
      sx={{ width: 260 }}
      renderOption={(props, user) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest} sx={{ gap: 1.5 }}>
            <Avatar src={user.avatarUrl} sx={{ width: 28, height: 28 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">{user.displayName}</Typography>
              <Typography variant="caption" color="text.secondary">
                @{user.username}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} autoFocus={autoFocus} placeholder="名前やユーザー名で検索" />
      )}
    />
  );
}
