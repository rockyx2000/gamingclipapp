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
import {
  getClip,
  getPlaylist,
  isLiked,
  likedClipIds,
  listClipComments,
  listClips,
} from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";
import type { ClipWithGame } from "@/lib/types";
import { formatViews, timeAgo } from "@/lib/format";
import { ClipCard } from "@/components/ClipCard";
import { ClipComments } from "@/components/ClipComments";
import { LikeButton } from "@/components/LikeButton";
import { PlaylistPanel } from "@/components/PlaylistPanel";
import { SaveButton } from "@/components/SaveButton";
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
// ?list=<プレイリスト ID> 付きで開くとプレイリスト再生になり、
// PC では右側に一覧を出して最後まで見たら次へ進み、スマホではプレイリストの順にスワイプする。
export default async function ClipPage(props: PageProps<"/clips/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const clip = getClip(id);
  if (!clip) notFound();
  const user = await getCurrentUser();

  const listId = typeof searchParams.list === "string" ? searchParams.list : undefined;
  const found = listId ? getPlaylist(listId, user?.id) : undefined;
  // クリップが入っていないプレイリストを指定された場合は通常の視聴にする
  const playlist = found?.clips.some((c) => c.id === clip.id) ? found : undefined;

  const sameGame = listClips({ gameSlug: clip.game.slug }).filter(
    (c) => c.id !== clip.id,
  );
  let feed: ClipWithGame[];
  let nextHref: string | undefined;
  if (playlist) {
    // プレイリストの順に並べ、開いたクリップの位置から見始める
    feed = playlist.clips;
    const next = playlist.clips[playlist.clips.findIndex((c) => c.id === clip.id) + 1];
    if (next) nextHref = `/clips/${next.id}?list=${playlist.id}`;
  } else {
    const otherGames = listClips().filter((c) => c.gameId !== clip.gameId);
    // スマホのフィード順: 開いたクリップ → 同じゲーム → 他のゲーム
    feed = [clip, ...sameGame, ...otherGames];
  }
  const likedIds = user ? likedClipIds(user.id, feed.map((c) => c.id)) : [];

  return (
    <>
      <Grid container spacing={3} sx={{ display: { xs: "none", md: "flex" } }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <WatchVideo
            // クリップが変わったら再生状態をリセットする
            key={clip.id}
            clipId={clip.id}
            src={clip.videoUrl}
            poster={clip.thumbnailUrl}
            nextHref={nextHref}
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
            <LikeButton
              key={clip.id}
              clipId={clip.id}
              initialLiked={user ? isLiked(clip.id, user.id) : false}
              initialLikes={clip.likes}
            />
            <SaveButton clipId={clip.id} />
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
          <Box sx={{ mt: 3 }}>
            <ClipComments
              key={clip.id}
              clipId={clip.id}
              uploaderId={clip.uploader.id}
              initialComments={listClipComments(clip.id) ?? []}
            />
          </Box>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          {playlist && <PlaylistPanel playlist={playlist} currentId={clip.id} />}
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

      <MobileClipFeed
        clips={feed}
        startId={clip.id}
        likedIds={likedIds}
        listId={playlist?.id}
      />
    </>
  );
}
