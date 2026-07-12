"use client";

import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import type { RecruitWithGame } from "@/lib/types";
import { timeAgo } from "@/lib/format";

export function RecruitCard({ recruit }: { recruit: RecruitWithGame }) {
  const closed = recruit.status === "closed";
  return (
    <Card variant="outlined" sx={{ opacity: closed ? 0.6 : 1 }}>
      <CardActionArea component={Link} href={`/recruits/${recruit.id}`}>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 1 }}>
            <Chip label={recruit.game.name} size="small" color="secondary" />
            {closed ? (
              <Chip label="募集終了" size="small" />
            ) : (
              <Chip label="募集中" size="small" color="success" variant="outlined" />
            )}
            {recruit.rank && (
              <Chip label={recruit.rank} size="small" variant="outlined" />
            )}
          </Stack>
          <Typography variant="h3" sx={{ mb: 0.5 }}>
            {recruit.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              mb: 1.5,
            }}
          >
            {recruit.body}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Avatar src={recruit.author.avatarUrl} sx={{ width: 24, height: 24 }} />
            <Typography variant="caption" color="text.secondary">
              {recruit.author.displayName} - {timeAgo(recruit.createdAt)}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {recruit.comments.length}
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
