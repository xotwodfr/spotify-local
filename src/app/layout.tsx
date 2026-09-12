import type { Metadata } from "next";
import { spotifyMixUI, spotifyMixTitle, spotifyMixMono } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home - Spotify",
  description: "Listen to the songs you love anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", spotifyMixUI.variable, spotifyMixTitle.variable, spotifyMixMono.variable)}>
      <body className="h-full overflow-hidden bg-black text-white">
        {children}
      </body>
    </html>
  );
}