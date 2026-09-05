"use client";

// アプリ全体の共通レイアウト（ヘッダー + サイドバー）

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
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
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import GroupsIcon from "@mui/icons-material/Groups";
import SearchIcon from "@mui/icons-material/Search";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "./AuthProvider";
import { Wordmark } from "./Wordmark";
import { colors } from "@/theme";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: "ホーム", href: "/", icon: <HomeIcon /> },
  { label: "ゲーム", href: "/games", icon: <SportsEsportsIcon /> },
  { label: "メンバー募集", href: "/recruits", icon: <GroupsIcon /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  const handleLogout = async () => {
    setMenuAnchor(null);
    await logout();
    router.push("/");
    router.refresh();
  };

  const drawerContent = (
    <Box sx={{ pt: 1 }}>
      <List>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            selected={pathname === item.href}
            onClick={() => setMobileOpen(false)}
            sx={{ mx: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
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
            sx={{ display: { md: "none" } }}
            aria-label="メニュー"
          >
            <MenuIcon />
          </IconButton>
          <Wordmark />

          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              flexGrow: 1,
              maxWidth: 560,
              mx: "auto",
              display: "flex",
              alignItems: "center",
              bgcolor: "background.paper",
              border: `1px solid ${colors.border}`,
              borderRadius: 1,
              px: 1.5,
              py: 0.25,
              "&:focus-within": { borderColor: colors.borderStrong },
            }}
          >
            <InputBase
              placeholder="クリップを検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ flexGrow: 1, fontSize: 14 }}
              inputProps={{ "aria-label": "クリップを検索" }}
            />
            <IconButton type="submit" size="small" aria-label="検索">
              <SearchIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
