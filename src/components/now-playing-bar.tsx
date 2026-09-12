export function PreviewBanner() {
  return (
    <div className="relative flex flex-1 items-center justify-between gap-6 overflow-hidden rounded-lg bg-[linear-gradient(90deg,#af2896,#509bf5)] px-6 py-2.5">
      <div>
        <div className="text-sm font-bold text-white">Preview of Spotify</div>
        <div className="text-base text-white max-[640px]:hidden">
          Sign up to get unlimited songs and podcasts with occasional ads. No credit card needed.
        </div>
      </div>
      <a
        href="https://accounts.spotify.com/en/login"
        className="shrink-0 rounded-full bg-white px-8 py-2 text-base font-bold text-black transition hover:scale-105"
      >
        Sign up free
      </a>
    </div>
  );
}

export function NowPlayingBar() {
  return (
    <div className="col-span-full h-[82px] bg-black p-2">
      <div className="flex h-[66px] items-center">
        <PreviewBanner />
      </div>
    </div>
  );
}