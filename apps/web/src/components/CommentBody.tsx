"use client";

// コメント本文。@メンションのうち実在するユーザーだけを強調して表示する。

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { splitMentions } from "@/lib/mentions";
import type { Comment } from "@/lib/types";
import { colors } from "@/theme";

export function CommentBody({ comment }: { comment: Pick<Comment, "body" | "mentions"> }) {
  return (
    <Typography
      variant="body2"
      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", mt: 0.25 }}
    >
      {splitMentions(comment.body, comment.mentions).map((part, i) =>
        part.mention ? (
          <Box
            key={i}
            component="span"
            title={part.mention.displayName}
            sx={{
              fontWeight: 600,
              px: 0.5,
              borderRadius: 0.5,
              bgcolor: colors.raised,
            }}
          >
            {part.text}
          </Box>
        ) : (
          part.text
        ),
      )}
    </Typography>
  );
}
