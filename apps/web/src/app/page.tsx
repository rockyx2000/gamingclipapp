import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { listClips, listTrending } from "@/lib/mock-db";
import { ClipGrid } from "@/components/ClipGrid";

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

  const clips = listClips();
  const trending = listTrending({ limit: 4 });

  return (
    <>
      {trending.length > 0 && (
        <Box component="section" sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 2 }}>
            <Typography variant="h2" sx={{ flexGrow: 1 }}>
              急上昇
            </Typography>
            {/* サーバーコンポーネントからは component={Link} を渡せないので Link で包む */}
            <Link href="/trending" style={{ textDecoration: "none", color: "inherit" }}>
              <Typography variant="body2" color="text.secondary">
                すべて見る
              </Typography>
            </Link>
          </Box>
          <ClipGrid clips={trending} />
        </Box>
      )}
      <Typography variant="h2" sx={{ mb: 2 }}>
        最新クリップ
      </Typography>
      <ClipGrid clips={clips} />
    </>
  );
}
