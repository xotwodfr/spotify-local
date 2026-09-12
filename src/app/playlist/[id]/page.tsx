import { Suspense } from "react";

import type { Metadata } from "next";

import { PlaylistView } from "@/components/playlist-view";

export const metadata: Metadata = {
  title: "Playlist - Spotify",
};

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <PlaylistView id={id} />
    </Suspense>
  );
}