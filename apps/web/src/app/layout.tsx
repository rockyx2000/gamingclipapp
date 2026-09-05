import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "@/theme";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

// 数字・欧文用のコンデンス書体（Barlow Condensed）と日本語本文用の書体（Noto Sans JP）。
// next/font はビルド時に Google Fonts へ接続するため、外部へ出られないビルド環境で失敗する。
// ここではブラウザ側で読み込む方式にし、CSS 変数を通して theme.ts から参照する。
// 将来はフォントファイルをリポジトリに置いて自前配信する（docs/architecture.md）。
const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap";

export const metadata: Metadata = {
  title: {
    default: "GameClips - ゲームクリップ共有",
    template: "%s | GameClips",
  },
  description:
    "1分以内のゲームクリップを共有して、チームメンバーを見つけよう。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
        <style>{`:root{--font-display:'Barlow Condensed';--font-body:'Noto Sans JP';}`}</style>
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
