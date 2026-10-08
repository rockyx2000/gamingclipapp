"use client";

// ユーザーを検索して複数選ぶ入力欄（クリップに映っているユーザーのタグ付け用）。
// 候補は /api/users/search（要ログイン）から取る。

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
  value: User[];
  onChange: (next: User[]) => void;
  /** 選べる人数の上限 */
  max: number;
  /** 候補に出さないユーザー（自分自身など） */
  excludeId?: string;
  label: string;
  helperText?: string;
  disabled?: boolean;
}

export function UserPicker({ value, onChange, max, excludeId, label, helperText, disabled }: Props) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const { data, loading } = useDebouncedFetch(
    open ? `/api/users/search?q=${encodeURIComponent(input.trim())}` : null,
    NO_USERS,
    150,
  );
  const options = data.users.filter((u) => u.id !== excludeId);
  const full = value.length >= max;

  return (
    <Autocomplete
      multiple
      value={value}
      onChange={(_, next) => onChange(next)}
      inputValue={input}
      onInputChange={(_, next, reason) => {
        if (reason !== "reset") setInput(next);
      }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      loadingText="検索中…"
      noOptionsText="該当するユーザーがいません"
      // 絞り込みは api 側で済んでいる
      filterOptions={(x) => x}
      getOptionLabel={(user) => user.displayName}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      getOptionDisabled={(user) => full && !value.some((v) => v.id === user.id)}
      disabled={disabled}
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
        <TextField
          {...params}
          label={label}
          placeholder={full ? "" : "名前やユーザー名で検索"}
          helperText={helperText}
        />
      )}
    />
  );
}
