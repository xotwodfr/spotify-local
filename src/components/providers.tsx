"use client";

import type { ReactNode } from "react";

import { PlayerProvider } from "@/components/player-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SettingsProvider } from "@/lib/settings";

/** Mounted once so global shortcuts never double-bind across bar instances. */
function ShortcutLayer() {
  useKeyboardShortcuts();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <PlayerProvider>
        <ThemeProvider>
          <ShortcutLayer />
          {children}
        </ThemeProvider>
      </PlayerProvider>
    </SettingsProvider>
  );
}