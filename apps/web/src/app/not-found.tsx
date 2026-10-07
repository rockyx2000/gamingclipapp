import type { Metadata } from "next";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { displaySx } from "@/theme";

export const metadata: Metadata = { title: "ページが見つかりません" };

// 存在しない URL と notFound() の両方で出す 404 ページ
export default function NotFound() {
  return (
    <Box sx={{ py: { xs: 8, sm: 12 }, textAlign: "center" }}>
      <Typography component="p" sx={{ ...displaySx, fontSize: { xs: 72, sm: 96 }, color: "text.secondary" }}>
        404
      </Typography>
      <Typography variant="h2" sx={{ mt: 2 }}>
        ページが見つかりません
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        URL が間違っているか、クリップが削除された可能性があります。
      </Typography>
      {/* サーバーコンポーネントからは component={Link} を渡せないので Link で包む */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <Button variant="contained">ホームへ戻る</Button>
      </Link>
    </Box>
  );
}
