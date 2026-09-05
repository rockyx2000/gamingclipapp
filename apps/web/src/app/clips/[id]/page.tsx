import type { Metadata } from "next";
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
import { displaySx } from "@/theme";
import { WatchVideo } from "@/components/WatchVideo";
import { MobileClipFeed } from "@/components/MobileClipFeed";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/clips/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const clip = getClip(id);
  return { title: clip?.title ?? "クリップ" };
}

// 視聴ページ。1 つの URL で、画面幅に応じて表示を切り替える。
// - PC (md 以上): YouTube 風のプレイヤー + 関連クリップ
// - スマホ (md 未満): MobileClipFeed による全画面の縦スワイプ視聴
export default async function ClipPage(props: PageProps<"/clips/[id]">) {
  const { id } = await props.params;
  const clip = getClip(id);
  if (!clip) notFound();

  const sameGame = listClips({ gameSlug: clip.game.slug }).filter(
    (c) => c.id !== clip.id,
  );
  const otherGames = listClips().filter((c) => c.gameId !== clip.gameId);
  // スマホのフィード順: 開いたクリップ → 同じゲーム → 他のゲーム
  const feed = [clip, ...sameGame, ...otherGames];

  return (
    <>
      <Grid container spacing={3} sx={{ display: { xs: "none", md: "flex" } }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <WatchVideo src={clip.videoUrl} poster={clip.thumbnailUrl} />
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
              sx={{ "& .MuiChip-label": { ...displaySx, fontSize: 16, pt: "1px" } }}
            />
            <Link
              href={`/games/${clip.game.slug}`}
              style={{ textDecoration: "none" }}
            >
              <Chip label={clip.game.name} clickable />
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
            {sameGame.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                まだ他のクリップはありません。
              </Typography>
            )}
            {sameGame.map((c) => (
              <ClipCard key={c.id} clip={c} />
            ))}
          </Stack>
        </Grid>
      </Grid>

      <MobileClipFeed clips={feed} startId={clip.id} />
    </>
  );
}
