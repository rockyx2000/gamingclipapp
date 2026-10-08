"use client";

// コメント用の入力欄。「@」に続けて打つとユーザーの候補が出て、選ぶと @ユーザー名 を入れる。
// 候補は /api/users/search（要ログイン）から取る。ログインしていない人には使わせない前提。

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { activeMention } from "@/lib/mentions";
import type { User } from "@/lib/types";
import { useDebouncedFetch } from "./useDebouncedFetch";

const NO_USERS: { users: User[] } = { users: [] };

type Props = Omit<TextFieldProps, "onChange" | "value" | "variant"> & {
  value: string;
  onChange: (next: string) => void;
};

export function MentionTextField({ value, onChange, onKeyDown, ...rest }: Props) {
  // ポップアップの位置合わせ先。描画中に ref を読まないよう state で持つ
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [caret, setCaret] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const mention = activeMention(value, caret);
  const open = mention !== undefined && mention.start !== dismissedAt;
  const { data } = useDebouncedFetch(
    open ? `/api/users/search?q=${encodeURIComponent(mention.query)}` : null,
    NO_USERS,
    150,
  );
  const options = open ? data.users : [];
  const index = Math.min(highlight, Math.max(options.length - 1, 0));

  const select = (user: User) => {
    if (!mention) return;
    const next = `${value.slice(0, mention.start)}@${user.username} ${value.slice(caret)}`;
    const nextCaret = mention.start + user.username.length + 2;
    onChange(next);
    setDismissedAt(null);
    setCaret(nextCaret);
    // 値が反映されてから、実際のキャレットの位置を戻す
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (open && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((index + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((index - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        select(options[index]);
        return;
      }
    }
    if (open && e.key === "Escape" && mention) {
      e.preventDefault();
      setDismissedAt(mention.start);
      return;
    }
    onKeyDown?.(e);
  };

  const sync = (target: HTMLTextAreaElement | HTMLInputElement) => {
    setCaret(target.selectionStart ?? target.value.length);
  };

  return (
    <>
      <TextField
        {...rest}
        ref={setAnchor}
        value={value}
        inputRef={inputRef}
        onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          onChange(e.target.value);
          sync(e.target);
          setHighlight(0);
          setDismissedAt(null);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => sync(e.target as HTMLTextAreaElement)}
        onClick={(e) => sync(e.target as HTMLTextAreaElement)}
        slotProps={{
          ...rest.slotProps,
          htmlInput: {
            ...(rest.slotProps?.htmlInput as object | undefined),
            role: "combobox",
            "aria-autocomplete": "list",
            "aria-expanded": open && options.length > 0,
          },
        }}
      />
      <Popper
        open={open && options.length > 0}
        anchorEl={anchor}
        placement="bottom-start"
        sx={{ zIndex: (t) => t.zIndex.modal + 1, width: anchor?.clientWidth, maxWidth: 360 }}
      >
        <Paper variant="outlined" sx={{ mt: 0.5, maxHeight: 280, overflowY: "auto" }}>
          <List dense disablePadding role="listbox" aria-label="メンションの候補">
            {options.map((user, i) => (
              <ListItemButton
                key={user.id}
                role="option"
                selected={i === index}
                aria-selected={i === index}
                // 入力欄からフォーカスを奪わない（blur で候補が消えるのを防ぐ）
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(user)}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar src={user.avatarUrl} sx={{ width: 28, height: 28 }} />
                </ListItemAvatar>
                <ListItemText primary={user.displayName} secondary={`@${user.username}`} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>
    </>
  );
}
