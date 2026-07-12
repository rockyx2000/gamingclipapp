import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BoltIcon from "@mui/icons-material/Bolt";
import type { ClipWithGame } from "@/lib/types";
import { ShortCard } from "./ShortCard";

// ホームに表示する横スクロールのショート一覧
export function ShortsRail({ shorts }: { shorts: ClipWithGame[] }) {
  if (shorts.length === 0) return null;
  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
        <BoltIcon color="primary" />
        <Typography variant="h3">ショート</Typography>
      </Stack>
      <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
        {shorts.map((clip) => (
          <ShortCard key={clip.id} clip={clip} />
        ))}
      </Box>
    </Box>
  );
}
