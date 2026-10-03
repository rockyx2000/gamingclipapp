"use client";

// 「新しいプレイリスト」ボタン。作成したらそのプレイリストのページへ移る

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { PlaylistFormDialog } from "./PlaylistFormDialog";

export function CreatePlaylistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        新しいプレイリスト
      </Button>
      <PlaylistFormDialog
        open={open}
        dialogTitle="新しいプレイリスト"
        submitLabel="作成"
        initial={{ title: "", description: "", visibility: "private" }}
        onClose={() => setOpen(false)}
        onSubmit={async (value) => {
          const res = await fetch("/api/playlists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(value),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
          router.push(`/playlists/${data.playlist.id}`);
        }}
      />
    </>
  );
}
