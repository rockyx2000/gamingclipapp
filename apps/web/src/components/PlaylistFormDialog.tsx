"use client";

// プレイリストの作成・編集ダイアログ（タイトル・説明・公開設定）

import { useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { PlaylistVisibility } from "@/lib/types";

export interface PlaylistFormValue {
  title: string;
  description: string;
  visibility: PlaylistVisibility;
}

interface Props {
  open: boolean;
  dialogTitle: string;
  submitLabel: string;
  initial: PlaylistFormValue;
  onClose: () => void;
  /** 失敗したらメッセージ付きの Error を投げる */
  onSubmit: (value: PlaylistFormValue) => Promise<void>;
}

export function PlaylistFormDialog(props: Props) {
  // 開くたびに初期値から始めるため、開いている間だけ中身をマウントする
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      {props.open && <FormBody {...props} />}
    </Dialog>
  );
}

function FormBody({ dialogTitle, submitLabel, initial, onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="タイトル"
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
            required
            autoFocus
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            label="説明"
            value={value.description}
            onChange={(e) => setValue({ ...value, description: e.target.value })}
            multiline
            minRows={3}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <TextField
            select
            label="公開設定"
            value={value.visibility}
            onChange={(e) =>
              setValue({ ...value, visibility: e.target.value as PlaylistVisibility })
            }
            helperText={
              value.visibility === "public"
                ? "リンクを知っている人は誰でも見られます"
                : "自分だけが見られます"
            }
          >
            <MenuItem value="private">非公開</MenuItem>
            <MenuItem value="public">公開</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !value.title.trim()}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
