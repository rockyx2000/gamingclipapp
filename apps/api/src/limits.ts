// 入力の上限。web のモック（mock-db.ts / shared の MAX_CLIP_COMMENT_LENGTH）と揃えてある。

export const MAX_PLAYLISTS_PER_USER = 100;
export const MAX_CLIPS_PER_PLAYLIST = 500;
export const MAX_PLAYLIST_TITLE = 100;
export const MAX_PLAYLIST_DESCRIPTION = 1000;

/** 同じ視聴者が同じクリップを見直しても、この間隔内なら 1 回として数える */
export const VIEW_DEDUPE_MS = 30 * 60 * 1000;
