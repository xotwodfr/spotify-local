import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps, vb: string) {
  const { width = 24, height = 24, role = "img", "aria-hidden": ariaHidden, ...rest } = props;
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: vb,
    width,
    height,
    role,
    "aria-hidden": ariaHidden ?? true,
    ...rest,
  } as const;
}

export function SpotifyLogo(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")} data-encore-id="logoSpotify">
      <title>Spotify</title>
      <path d="M13.427.01C6.805-.253 1.224 4.902.961 11.524.698 18.147 5.853 23.728 12.476 23.99c6.622.263 12.203-4.892 12.466-11.514S20.049.272 13.427.01m5.066 17.579a.717.717 0 0 1-.977.268 14.4 14.4 0 0 0-5.138-1.747 14.4 14.4 0 0 0-5.42.263.717.717 0 0 1-.338-1.392c1.95-.474 3.955-.571 5.958-.29 2.003.282 3.903.928 5.647 1.92a.717.717 0 0 1 .268.978m1.577-3.15a.93.93 0 0 1-1.262.376 17.7 17.7 0 0 0-5.972-1.96 17.7 17.7 0 0 0-6.281.238.93.93 0 0 1-1.11-.71.93.93 0 0 1 .71-1.11 19.5 19.5 0 0 1 6.94-.262 19.5 19.5 0 0 1 6.599 2.165c.452.245.62.81.376 1.263m1.748-3.551a1.147 1.147 0 0 1-1.546.488 21.4 21.4 0 0 0-6.918-2.208 21.4 21.4 0 0 0-7.259.215 1.146 1.146 0 0 1-.456-2.246 23.7 23.7 0 0 1 8.034-.24 23.7 23.7 0 0 1 7.657 2.445c.561.292.78.984.488 1.546" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="M13.5 1.515a3 3 0 0 0-3 0L3 5.845a2 2 0 0 0-1 1.732V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6h4v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7.577a2 2 0 0 0-1-1.732z" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z" />
    </svg>
  );
}

export function IconCreate(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606" />
    </svg>
  );
}

export function IconShuffle(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z" />
    </svg>
  );
}

export function IconPrevious(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z" />
    </svg>
  );
}

export function IconNext(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z" />
    </svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75z" />
    </svg>
  );
}

export function IconVolume(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.64 3.64 0 0 1-1.33-4.967 3.64 3.64 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.14 2.14 0 0 0 0 3.7l5.8 3.35V2.8zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88" />
    </svg>
  );
}

export function IconQueue(props: IconProps) {
  return (
    <svg {...base(props, "0 0 16 16")}>
      <path d="M15 15H1v-1.5h14V15Zm0-4.5H1V9h14v1.5Zm0-4.5H1V4.5h14V6Zm0-4.5H1V0h14V1.5Z" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconLyrics(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="M12 2a10 10 0 1 0 4.29 19.05L22 22l-.95-5.71A10 10 0 0 0 12 2Zm-3.5 8a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm3.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Zm3.5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconClose(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="M5.105 3.604 3.604 5.105 10.5 12l-6.896 6.895 1.5 1.5L12 13.5l6.895 6.895 1.5-1.5L13.5 12l6.895-6.895-1.5-1.5L12 10.5z" />
    </svg>
  );
}

export function IconDockLyrics(props: IconProps) {
  return (
    <svg {...base(props, "0 0 24 24")}>
      <path d="M4 3.5a2.5 2.5 0 0 0-2.5 2.5v9A2.5 2.5 0 0 0 4 17.5h9.5l4.5 3.6V17.5H20a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 20 3.5zm3 4.5h10v1.8H7zm0 4h7v1.8H7z" />
    </svg>
  );
}
