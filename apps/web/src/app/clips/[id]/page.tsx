import { notFound } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import { getClip, listClips } from "@/lib/mock-db";
import { formatViews, timeAgo } from "@/lib/format";
import { ClipCard } from "@/components/ClipCard";

export const dynamic = "force-dynamic";

export default async function ClipPage(props: PageProps<"/clips/[id]">) {
  const { id } = await props.params;
  const clip = getClip(id);
  if (!clip) notFound();

  const related = listClips({ gameSlug: clip.game.slug }).filter(
    (c) => c.id !== clip.id,
  );

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Box
          component="video"
          src={clip.videoUrl}
          poster={clip.thumbnailUrl}
          controls
          autoPlay
          sx={{
            width: "100%",
            aspectRatio: clip.type === "short" ? "9 / 16" : "16 / 9",
            maxHeight: "70vh",
            borderRadius: 3,
            bgcolor: "#000",
          }}
        />
        <Typography variant="h2" sx={{ mt: 2 }}>
          {clip.title}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1.5 }}>
          <Avatar src={clip.uploader.avatarUrl} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2">
              {clip.uploader.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{clip.uploader.username}
            </Typography>
          </Box>
          <Chip
            icon={<ThumbUpOutlinedIcon />}
            label={clip.likes.toLocaleString()}
            variant="outlined"
          />
          <Link
            href={`/games/${clip.game.slug}`}
            style={{ textDecoration: "none" }}
          >
            <Chip label={clip.game.name} color="secondary" clickable />
          </Link>
        </Stack>
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {formatViews(clip.views)} - {timeAgo(clip.createdAt)}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
            {clip.description}
          </Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          {clip.game.name} の他のクリップ
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1}>
          {related.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              まだ他のクリップはありません。
            </Typography>
          )}
          {related.map((c) => (
            <ClipCard key={c.id} clip={c} />
          ))}
        </Stack>
      </Grid>
    </Grid>
  );
}
