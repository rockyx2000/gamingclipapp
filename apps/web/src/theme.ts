"use client";

import { createTheme } from "@mui/material/styles";

// YouTube 風のダーク基調に、Instagram 風のグラデーションをアクセントに使うテーマ

export const accentGradient =
  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#e91e63",
    },
    secondary: {
      main: "#9c27b0",
    },
    background: {
      default: "#0f0f0f",
      paper: "#1c1c1e",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  typography: {
    fontFamily: [
      "Roboto",
      "Helvetica Neue",
      "Hiragino Kaku Gothic ProN",
      "Noto Sans JP",
      "sans-serif",
    ].join(","),
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 700 },
    h3: { fontSize: "1.25rem", fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#0f0f0f",
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
});
