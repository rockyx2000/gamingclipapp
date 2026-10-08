"use client";

// クリップのコメント欄（PC の視聴ページと、スマホのコメントシートで共用）

import { MAX_CLIP_COMMENT_LENGTH } from "@/lib/types";
import { CommentThread } from "./CommentThread";

interface Props {
  clipId: string;
  /** クリップの投稿者。投稿者は他人のコメントも削除できる */
  uploaderId: string;
  /** ページが知っているコメント数（読み込む前の表示用） */
  initialCount?: number;
  /** 件数が変わったら呼ばれる（スマホのコメントボタンの数字を合わせる用） */
  onCountChange?: (count: number) => void;
}

export function ClipComments({ clipId, uploaderId, initialCount, onCountChange }: Props) {
  return (
    <CommentThread
      listUrl={`/api/clips/${clipId}/comments`}
      deleteUrl={(comment) => `/api/clips/${clipId}/comments/${comment.id}`}
      canDelete={(comment, user) => comment.author.id === user.id || uploaderId === user.id}
      badgeFor={(comment) => (comment.author.id === uploaderId ? "投稿者" : undefined)}
      placeholder="コメントを追加（@ でユーザーを呼べます）"
      maxLength={MAX_CLIP_COMMENT_LENGTH}
      initialCount={initialCount}
      onCountChange={onCountChange}
    />
  );
}
