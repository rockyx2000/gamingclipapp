"use client";

// PC 視聴ページの「保存」ボタン。未ログインならログインへ送る

import { useState } from "react";
import Chip from "@mui/material/Chip";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { SaveToPlaylistDialog } from "./SaveToPlaylistDialog";
import { useRequireLogin } from "./useRequireLogin";

export function SaveButton({ clipId }: { clipId: string }) {
  const requireLogin = useRequireLogin();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Chip
        icon={<PlaylistAddIcon />}
        label="保存"
        variant="outlined"
        clickable
        onClick={() => {
          if (requireLogin()) setOpen(true);
        }}
      />
      <SaveToPlaylistDialog open={open} onClose={() => setOpen(false)} clipId={clipId} />
    </>
  );
}
