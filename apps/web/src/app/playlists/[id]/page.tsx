import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlaylist } from "@/lib/clips";
import { PlaylistDetail } from "@/components/PlaylistDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/playlists/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const user = await getCurrentUser();
  return { title: (await getPlaylist(id, user?.id))?.title ?? "プレイリスト" };
}

// プレイリストの詳細。非公開のものは持ち主以外には 404 にする
export default async function PlaylistPage(props: PageProps<"/playlists/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const playlist = await getPlaylist(id, user?.id);
  if (!playlist) notFound();
  return (
    <PlaylistDetail
      // 別のプレイリストへ移ったら状態を作り直す
      key={playlist.id}
      initial={playlist}
      isOwner={playlist.owner.id === user?.id}
    />
  );
}
