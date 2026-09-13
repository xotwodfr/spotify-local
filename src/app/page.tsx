import { Suspense } from "react";

import type { Metadata } from "next";

import { HomeContent } from "@/components/home-content";

export const metadata: Metadata = {
  title: "Home",
  description: "Listen to the songs you love anywhere.",
};

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}