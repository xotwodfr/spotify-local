import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconHome, IconSearch, IconSettings } from "@/components/icons";

function TabLink({
  href,
  label,
  active = false,
  children,
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--fg-primary) ${
        active ? "text-(--fg-primary)" : "text-(--text-subdued) hover:text-(--fg-primary)"
      }`}
    >
      {children}
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="flex h-[58px] w-full items-stretch justify-around border-t border-(--border-color) bg-[color-mix(in_oklab,var(--frame)_95%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <TabLink href="/" label="Home" active={pathname === "/"}>
        <IconHome className="h-6 w-6 fill-current" />
      </TabLink>
      <TabLink href="/search" label="Search" active={pathname === "/search"}>
        <IconSearch className="h-6 w-6 fill-current" />
      </TabLink>
      <TabLink href="/settings" label="Settings" active={pathname === "/settings"}>
        <IconSettings className="h-6 w-6 fill-none stroke-current" />
      </TabLink>
    </nav>
  );
}
