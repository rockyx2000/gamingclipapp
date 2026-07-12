import type { Metadata } from "next";
import Typography from "@mui/material/Typography";
import { listClips } from "@/lib/mock-db";
import { ShortsFeed } from "@/components/ShortsFeed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ショート" };

export default async function ShortsPage(props: PageProps<"/shorts">) {
  const searchParams = await props.searchParams;
  const startId =
    typeof searchParams.start === "string" ? searchParams.start : undefined;
  const shorts = listClips({ type: "short" });

  if (shorts.length === 0) {
    return (
      <Typography color="text.secondary">
        ショート動画はまだありません。
      </Typography>
    );
  }
  return <ShortsFeed shorts={shorts} startId={startId} />;
}
