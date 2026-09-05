"use client";

import { createTheme } from "@mui/material/styles";

// 配信のスコアボードを思わせる、寒色寄りのチャコール基調のテーマ。
// 色はサムネイルと動画が持ってくるので UI は静かにし、
// アクセント（金）は「投稿」「現在地」「募集中」など要所に限って使う。

export const colors = {
  bg: "#15171b",
  surface: "#1d2026",
  raised: "#262a31",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  text: "#f2f3f5",
  muted: "#9aa0a8",
  accent: "#f2b705",
  onAccent: "#15171b",
} as const;

// 数字・欧文専用のコンデンス書体（再生時間、件数、ロゴ）。日本語には使わない。
export const displayFont =
  "var(--font-display), 'Barlow Condensed', 'Arial Narrow', sans-serif";
export const bodyFont =
  "var(--font-body), 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif";

/** 数字を表示書体で組むときの共通スタイル */
export const displaySx = {
  fontFamily: displayFont,
  fontWeight: 700,
  letterSpacing: "0.02em",
  lineHeight: 1,
} as const;

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.accent,
      contrastText: colors.onAccent,
    },
    secondary: {
      main: colors.muted,
    },
    background: {
      default: colors.bg,
      paper: colors.surface,
    },
    text: {
      primary: colors.text,
      secondary: colors.muted,
    },
    divider: colors.border,
  },
  typography: {
    fontFamily: bodyFont,
    h1: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 },
    h2: { fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 },
    h3: { fontSize: "1.0625rem", fontWeight: 700, lineHeight: 1.4 },
    subtitle2: { fontWeight: 600, lineHeight: 1.4 },
    body2: { lineHeight: 1.6 },
    caption: { fontSize: "0.75rem", lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.bg,
          backgroundImage: "none",
          boxShadow: "none",
          borderBottom: `1px solid ${colors.border}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.bg,
          backgroundImage: "none",
          borderRight: `1px solid ${colors.border}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: colors.border },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            fontWeight: 700,
            "&:hover": { backgroundColor: "#ffc82e" },
          },
        },
      ],
      styleOverrides: {
        root: { borderRadius: 4, paddingLeft: 16, paddingRight: 16 },
        outlined: {
          borderColor: colors.borderStrong,
          color: colors.text,
          "&:hover": {
            borderColor: colors.text,
            backgroundColor: "rgba(255,255,255,0.04)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
          backgroundColor: colors.raised,
        },
        sizeSmall: { height: 22, fontSize: "0.75rem" },
        outlined: {
          backgroundColor: "transparent",
          borderColor: colors.borderStrong,
        },
        clickable: {
          "&:hover": { backgroundColor: "#30353d" },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: colors.text, height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minWidth: 0,
          paddingLeft: 12,
          paddingRight: 12,
          "&.Mui-selected": { color: colors.text },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          position: "relative",
          "&.Mui-selected": {
            backgroundColor: colors.raised,
            // 現在地を示す金の縦線
            "&::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 8,
              bottom: 8,
              width: 3,
              borderRadius: 2,
              backgroundColor: colors.accent,
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: colors.surface,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.border },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: colors.borderStrong,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: colors.raised, fontSize: "0.75rem" },
      },
    },
  },
});
