"use client";

import type { ReactNode } from "react";

import { PlayerProvider } from "@/components/player-provider";

export function Providers({ children }: { children: ReactNode }) {
  return <PlayerProvider>{children}</PlayerProvider>;
}