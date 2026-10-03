import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { getCurrentUser } from "@/lib/auth";
import { listLikedClips, listPlaylistsByOwner } from "@/lib/mock-db";
import { timeAgo } from "@/lib/format";
import { CreatePlaylistButton } from "@/components/CreatePlaylistButton";
import { LoginPrompt } from "@/components/LoginPrompt";
import { PlaylistCard } from "@/components/PlaylistCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "プレイリスト" };

// 自分のプレイリスト一覧。先頭に「高く評価したクリップ」（いいねした一覧）を置く
export default async function PlaylistsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginPrompt
        message="プレイリストを作るにはログインしてください。"
        next="/playlists"
      />
    );
  }
  const playlists = listPlaylistsByOwner(user.id);
  const liked = listLikedClips(user.id);

  return (
    <>
      <Box
        sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 3 }}
      >
        <Typography variant="h2" sx={{ flexGrow: 1 }}>
          プレイリスト
        </Typography>
        <CreatePlaylistButton />
      </Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <PlaylistCard
            href="/liked"
            title="高く評価したクリップ"
            count={liked.length}
            thumbnailUrl={liked[0]?.thumbnailUrl}
            meta="いいねしたクリップ"
            isPrivate
          />
        </Grid>
        {playlists.map((p) => (
          <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <PlaylistCard
              href={`/playlists/${p.id}`}
              title={p.title}
              count={p.clips.length}
              thumbnailUrl={p.clips[0]?.thumbnailUrl}
              meta={`最終更新 ${timeAgo(p.updatedAt)}`}
              isPrivate={p.visibility === "private"}
            />
          </Grid>
        ))}
      </Grid>
      {playlists.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          視聴ページの「保存」から、クリップをプレイリストにまとめられます。
        </Typography>
      )}
    </>
  );
}
