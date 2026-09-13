import { Suspense } from "react";

import type { Metadata } from "next";

import { AlbumView } from "@/components/album-view";

export const metadata: Metadata = {
  title: "Album",
};

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <AlbumView id={id} />
    </Suspense>
  );
}