import { IconHome, IconSearch } from "@/components/icons";

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
      <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h.5A1.75 1.75 0 0 1 7 3.75v16.5A1.75 1.75 0 0 1 5.25 22h-.5A1.75 1.75 0 0 1 3 20.25V3.75ZM10 3.75A1.75 1.75 0 0 1 11.75 2h.5A1.75 1.75 0 0 1 14 3.75v10.5A1.75 1.75 0 0 1 12.25 16h-.5a1.75 1.75 0 0 1-1.75-1.75V3.75ZM17 3.75A1.75 1.75 0 0 1 18.75 2h.5A1.75 1.75 0 0 1 21 3.75v10.5A1.75 1.75 0 0 1 19.25 16h-.5a1.75 1.75 0 0 1-1.75-1.75V3.75Z" />
    </svg>
  );
}

function PremiumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 fill-current">
      <path d="M12 2 14.2 7 19.8 7.6 15.7 11.3 16.8 16.8 12 13.9 7.2 16.8 8.3 11.3 4.2 7.6 9.8 7Z" />
      <path d="M5 19h14v2H5z" />
    </svg>
  );
}

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
    <a
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-1 ${
        active ? "text-white" : "text-[#b3b3b3]"
      }`}
    >
      {children}
      <span className="text-[10px] font-semibold">{label}</span>
    </a>
  );
}

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="flex h-[58px] items-stretch justify-around border-t border-[#292929] bg-black md:hidden"
    >
      <TabLink href="#" label="Home" active>
        <IconHome className="h-6 w-6 fill-current" />
      </TabLink>
      <TabLink href="#" label="Search">
        <IconSearch className="h-6 w-6 fill-current" />
      </TabLink>
      <TabLink href="#" label="Your Library">
        <LibraryIcon />
      </TabLink>
      <TabLink href="#" label="Premium">
        <PremiumIcon />
      </TabLink>
    </nav>
  );
}