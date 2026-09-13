"use client";

import type { ReactNode } from "react";

import { PlayerProvider } from "@/components/player-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/lib/settings";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <PlayerProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </PlayerProvider>
    </SettingsProvider>
  );
}