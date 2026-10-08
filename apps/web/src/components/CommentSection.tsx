"use client";

// 募集詳細ページのコメント欄

import Box from "@mui/material/Box";
import { CommentThread } from "./CommentThread";

interface Props {
  recruitId: string;
  /** ページが知っているコメント数（読み込む前の表示用） */
  initialCount?: number;
}

// api の募集コメントの上限（apps/api の RECRUIT_LIMITS.comment）と揃える
const MAX_RECRUIT_COMMENT_LENGTH = 500;

export function CommentSection({ recruitId, initialCount }: Props) {
  return (
    <Box sx={{ mt: 3 }}>
      <CommentThread
        listUrl={`/api/recruits/${recruitId}/comments`}
        placeholder="コメントを書く（例: 参加希望です！ランクは〇〇です。@ でユーザーを呼べます）"
        maxLength={MAX_RECRUIT_COMMENT_LENGTH}
        initialCount={initialCount}
      />
    </Box>
  );
}
