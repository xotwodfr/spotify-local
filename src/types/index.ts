export type RailKind = "track" | "artist" | "album" | "playlist";

export interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  kind: RailKind;
  explicit?: boolean;
  onPlay?: () => void;
}

export interface Rail {
  id: string;
  title: string;
  kind: RailKind;
  items: CardItem[];
  showAllHref?: string;
}

export interface SocialLink {
  id: string;
  label: string;
  href: string;
  icon: "instagram" | "x" | "facebook";
}

export interface FooterLinkGroup {
  id: string;
  header: string;
  links: { label: string; href: string }[];
}