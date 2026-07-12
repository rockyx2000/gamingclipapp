import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { ClipWithGame } from "@/lib/types";
import { ClipCard } from "./ClipCard";

export function ClipGrid({ clips }: { clips: ClipWithGame[] }) {
  if (clips.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        クリップが見つかりませんでした。
      </Typography>
    );
  }
  return (
    <Grid container spacing={2}>
      {clips.map((clip) => (
        <Grid key={clip.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <ClipCard clip={clip} />
        </Grid>
      ))}
    </Grid>
  );
}
