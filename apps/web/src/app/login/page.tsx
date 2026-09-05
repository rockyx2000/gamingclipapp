"use client";

// モックログインページ
// パスワードなし・ユーザー名のみの簡易認証。デモユーザーを選んでログインできる。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useAuth } from "@/components/AuthProvider";
import type { User } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, []);

  const handleLogin = async (username: string) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "ログインに失敗しました");
      return;
    }
    await refresh();
    router.push("/");
    router.refresh();
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, maxWidth: 480, mx: "auto" }}>
      <Typography variant="h2" sx={{ mb: 1 }}>
        ログイン
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        モック版のため、デモユーザーを選ぶだけでログインできます。
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <List>
        {users.map((user) => (
          <ListItemButton
            key={user.id}
            onClick={() => handleLogin(user.username)}
          >
            <ListItemAvatar>
              <Avatar src={user.avatarUrl} />
            </ListItemAvatar>
            <ListItemText
              primary={user.displayName}
              secondary={`@${user.username}`}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}
