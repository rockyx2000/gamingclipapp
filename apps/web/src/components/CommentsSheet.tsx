"use client";

// スマホのフィードで下からせり上がるコメントシート（Shorts と同じ見せ方）

import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { ClipComments } from "./ClipComments";

interface Props {
  open: boolean;
  onClose: () => void;
  clipId: string;
  uploaderId: string;
  onCountChange: (count: number) => void;
}

export function CommentsSheet({ open, onClose, clipId, uploaderId, onCountChange }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            height: "70dvh",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <Box sx={{ position: "relative", height: "100%", overflowY: "auto", px: 2, pt: 2, pb: 4 }}>
        <IconButton
          onClick={onClose}
          aria-label="閉じる"
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>
        {open && (
          <ClipComments clipId={clipId} uploaderId={uploaderId} onCountChange={onCountChange} />
        )}
      </Box>
    </Drawer>
  );
}
