import { Suspense } from "react";

import type { Metadata } from "next";

import { ArtistView } from "@/components/artist-view";

export const metadata: Metadata = {
  title: "Artist",
};

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ArtistView id={id} />
    </Suspense>
  );
}