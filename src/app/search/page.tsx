import { Suspense } from "react";

import type { Metadata } from "next";

import { SearchView } from "@/components/search-view";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  void searchParams;
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}