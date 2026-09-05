import { notFound } from "next/navigation";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getRecruit } from "@/lib/mock-db";
import { timeAgo } from "@/lib/format";
import { CommentSection } from "@/components/CommentSection";
import { RecruitStatusChip } from "@/components/RecruitStatusChip";

export const dynamic = "force-dynamic";

export default async function RecruitDetailPage(
  props: PageProps<"/recruits/[id]">,
) {
  const { id } = await props.params;
  const recruit = getRecruit(id);
  if (!recruit) notFound();

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: "auto" }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 2 }}>
        <RecruitStatusChip status={recruit.status} />
        <Link
          href={`/games/${recruit.game.slug}`}
          style={{ textDecoration: "none" }}
        >
          <Chip label={recruit.game.name} clickable />
        </Link>
        {recruit.rank && <Chip label={recruit.rank} variant="outlined" />}
        {recruit.positions.map((p) => (
          <Chip key={p} label={p} size="small" variant="outlined" />
        ))}
      </Stack>

      <Typography variant="h1" sx={{ mb: 2 }}>
        {recruit.title}
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
        <Avatar src={recruit.author.avatarUrl} />
        <Typography variant="subtitle2">
          {recruit.author.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {timeAgo(recruit.createdAt)}
        </Typography>
      </Stack>

      <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
        {recruit.body}
      </Typography>

      <Divider sx={{ my: 3 }} />
      <CommentSection recruitId={recruit.id} comments={recruit.comments} />
    </Paper>
  );
}
