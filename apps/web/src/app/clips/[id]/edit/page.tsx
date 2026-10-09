import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { getCurrentUser } from "@/lib/auth";
import { getClip } from "@/lib/clips";
import { listGames } from "@/lib/games";
import { EditClipForm } from "@/components/EditClipForm";
import { LoginPrompt } from "@/components/LoginPrompt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "クリップを編集" };

// 投稿したクリップの編集画面。タイトル・説明・ゲーム・サムネイル・映像の上のタグを直せる。
// 映像そのもの（フィルターやテキストを焼き込んだもの）は、投稿後には変えられない。
export default async function EditClipPage(props: PageProps<"/clips/[id]/edit">) {
  const { id } = await props.params;
  const [clip, user] = await Promise.all([getClip(id), getCurrentUser()]);
  if (!clip) notFound();
  if (!user) {
    return (
      <LoginPrompt message="クリップを編集するにはログインしてください。" next={`/clips/${id}/edit`} />
    );
  }
  if (user.id !== clip.uploader.id) {
    return (
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          このクリップを編集できるのは投稿者だけです。
        </Typography>
        <Link href={`/clips/${id}`} style={{ textDecoration: "none" }}>
          <Button variant="outlined">クリップに戻る</Button>
        </Link>
      </Paper>
    );
  }
  return <EditClipForm clip={clip} games={await listGames()} />;
}
