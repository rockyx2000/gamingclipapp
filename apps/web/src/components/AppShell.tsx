"use client";

// アプリ全体の共通レイアウト（ヘッダー + サイドバー）

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import GroupsIcon from "@mui/icons-material/Groups";
import SearchIcon from "@mui/icons-material/Search";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "./AuthProvider";
import { SearchBox } from "./SearchBox";
import { Wordmark } from "./Wordmark";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: "ホーム", href: "/", icon: <HomeIcon /> },
  { label: "急上昇", href: "/trending", icon: <WhatshotIcon /> },
  { label: "ランキング", href: "/ranking", icon: <LeaderboardIcon /> },
  { label: "ゲーム", href: "/games", icon: <SportsEsportsIcon /> },
  { label: "メンバー募集", href: "/recruits", icon: <GroupsIcon /> },
];

// 自分のライブラリ。未ログインでも出し、開くとログインを案内する
const LIBRARY_ITEMS = [
  { label: "プレイリスト", href: "/playlists", icon: <PlaylistPlayIcon /> },
  { label: "高く評価したクリップ", href: "/liked", icon: <ThumbUpOutlinedIcon /> },
];

/** 下の階層（/games/xxx など）にいるときも親のナビを現在地として扱う */
function isCurrent(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // スマホ幅では検索欄を畳んでおき、虫眼鏡で開く
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleLogout = async () => {
    setMenuAnchor(null);
    await logout();
    router.push("/");
    router.refresh();
  };

  const renderNav = (items: typeof NAV_ITEMS) => (
    <List>
      {items.map((item) => (
        <ListItemButton
          key={item.href}
          component={Link}
          href={item.href}
          selected={isCurrent(pathname, item.href)}
          onClick={() => setMobileOpen(false)}
          sx={{ mx: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  const drawerContent = (
    <Box sx={{ pt: 1 }}>
      {renderNav(NAV_ITEMS)}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 3 }}>
        ライブラリ
      </Typography>
      {renderNav(LIBRARY_ITEMS)}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="text.secondary" sx={{ px: 3 }}>
        1分以内のゲームクリップ共有
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ display: { xs: searchOpen ? "none" : "inline-flex", md: "none" } }}
            aria-label="メニュー"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { xs: searchOpen ? "none" : "block", sm: "block" } }}>
            <Wordmark />
          </Box>

          <SearchBox searchOpen={searchOpen} onClose={() => setSearchOpen(false)} />

          <Box
            sx={{
              display: { xs: searchOpen ? "none" : "flex", sm: "flex" },
              alignItems: "center",
              gap: 1,
              ml: { xs: "auto", sm: 0 },
            }}
          >
            <IconButton
              onClick={() => setSearchOpen(true)}
              aria-label="検索を開く"
              sx={{ display: { sm: "none" } }}
            >
              <SearchIcon />
            </IconButton>
            {user ? (
              <>
                <Button
                  component={Link}
                  href="/upload"
                  variant="contained"
                  size="small"
                  startIcon={<VideoCallIcon />}
                  sx={{ display: { xs: "none", sm: "inline-flex" } }}
                >
                  投稿
                </Button>
                <Tooltip title="クリップを投稿">
                  <IconButton
                    component={Link}
                    href="/upload"
                    aria-label="クリップを投稿"
                    sx={{ display: { sm: "none" }, color: "primary.main" }}
                  >
                    <VideoCallIcon />
                  </IconButton>
                </Tooltip>
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  size="small"
                  aria-label="アカウントメニュー"
                >
                  <Avatar src={user.avatarUrl} sx={{ width: 32, height: 32 }} />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                >
                  <MenuItem disabled>{user.displayName}</MenuItem>
                  <MenuItem onClick={handleLogout}>ログアウト</MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="small"
                sx={{ whiteSpace: "nowrap" }}
              >
                ログイン
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* デスクトップ: 常設サイドバー */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* モバイル: 一時表示サイドバー */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
