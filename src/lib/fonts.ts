import localFont from "next/font/local";

export const spotifyMixUI = localFont({
  src: [
    {
      path: "../app/fonts/SpotifyMixUI-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../app/fonts/SpotifyMixUI-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-spotify-mix-ui",
  display: "swap",
});

export const spotifyMixTitle = localFont({
  src: "../app/fonts/SpotifyMixUITitleVariable.woff2",
  variable: "--font-spotify-mix-title",
  display: "swap",
  weight: "400 900",
});

export const spotifyMixMono = localFont({
  src: "../app/fonts/SpotifyMixMono-Regular.woff2",
  variable: "--font-spotify-mix-mono",
  display: "swap",
  weight: "400",
});