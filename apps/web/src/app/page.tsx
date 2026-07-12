import Typography from "@mui/material/Typography";
import { listClips } from "@/lib/mock-db";
import { ClipGrid } from "@/components/ClipGrid";
import { ShortsRail } from "@/components/ShortsRail";

// 投稿が即時反映されるよう常に動的レンダリングにする
export const dynamic = "force-dynamic";

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  if (q) {
    const results = listClips({ query: q });
    return (
      <>
        <Typography variant="h2" sx={{ mb: 2 }}>
          「{q}」の検索結果
        </Typography>
        <ClipGrid clips={results} />
      </>
    );
  }

  const shorts = listClips({ type: "short" });
  const clips = listClips({ type: "clip" });

  return (
    <>
      <ShortsRail shorts={shorts} />
      <Typography variant="h2" sx={{ mb: 2 }}>
        最新クリップ
      </Typography>
      <ClipGrid clips={clips} />
    </>
  );
}
