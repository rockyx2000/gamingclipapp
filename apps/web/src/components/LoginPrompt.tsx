"use client";

// ログインが必要なページで、未ログインのときに出す案内

import Link from "next/link";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export function LoginPrompt({ message, next }: { message: string; next: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, maxWidth: 480, mx: "auto", textAlign: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {message}
      </Typography>
      <Button
        component={Link}
        href={`/login?next=${encodeURIComponent(next)}`}
        variant="contained"
      >
        ログイン
      </Button>
    </Paper>
  );
}
