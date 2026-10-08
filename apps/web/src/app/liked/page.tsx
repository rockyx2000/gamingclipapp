import type { Metadata } from "next";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getCurrentUser } from "@/lib/auth";
import { listLikedClips } from "@/lib/clips";
import { formatViews, timeAgo } from "@/lib/format";
import { ClipRow } from "@/components/ClipRow";
import { LoginPrompt } from "@/components/LoginPrompt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "高く評価したクリップ" };

// 自分がいいねしたクリップ（いいねが新しい順）
export default async function LikedPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginPrompt
        message="いいねしたクリップを見るにはログインしてください。"
        next="/liked"
      />
    );
  }
  const clips = await listLikedClips();
  return (
    <>
      <Typography variant="h2" sx={{ mb: 2 }}>
        高く評価したクリップ
      </Typography>
      {clips.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }}>
          まだいいねしたクリップはありません。
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {clips.map((clip) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              meta={
                <>
                  {formatViews(clip.views)}
                  {"　"}
                  {timeAgo(clip.createdAt)}
                </>
              }
            />
          ))}
        </Stack>
      )}
    </>
  );
}
