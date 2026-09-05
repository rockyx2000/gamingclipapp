"use client";

// 動画ファイルのドラッグ＆ドロップ / 選択

import { useState, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { colors } from "@/theme";

interface Props {
  accept: string[];
  busy?: boolean;
  onFile: (file: File) => void;
}

export function FileDropzone({ accept, busy = false, onFile }: Props) {
  const [over, setOver] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      sx={{
        border: `2px dashed ${over ? colors.text : colors.borderStrong}`,
        borderRadius: 1,
        bgcolor: over ? colors.raised : "transparent",
        p: { xs: 4, md: 6 },
        textAlign: "center",
        transition: "border-color 0.15s, background-color 0.15s",
      }}
    >
      <CloudUploadIcon sx={{ fontSize: 40, color: "text.secondary" }} />
      <Typography variant="h3" sx={{ mt: 1 }}>
        動画をここにドロップ
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        mp4 / webm / mov。長い動画でも大丈夫です。投稿する1分以内の範囲は次の画面で選べます。
      </Typography>
      <Button component="label" variant="outlined" disabled={busy}>
        {busy ? "読み込み中..." : "ファイルを選ぶ"}
        <input
          type="file"
          accept={accept.join(",")}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </Button>
    </Box>
  );
}
