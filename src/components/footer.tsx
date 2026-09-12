import { IconFacebook, IconInstagram, IconX } from "@/components/icons";
import {
  footerCompany,
  footerCommunities,
  footerPlans,
  footerUseful,
} from "@/lib/catalog";

const linkGroups = [
  { header: "Company", links: footerCompany },
  { header: "Communities", links: footerCommunities },
  { header: "Useful links", links: footerUseful },
  { header: "Spotify Plans", links: footerPlans },
];

export function Footer() {
  return (
    <nav className="bg-[#121212] px-6 pb-10 pt-2">
      <div className="mt-8 flex flex-wrap justify-between">
        <div className="flex flex-wrap">
          {linkGroups.map(({ header, links }) => (
            <div key={header} className="mb-8 mr-6 w-[172px]">
              <div className="mb-4 text-base font-bold text-white">{header}</div>
              <ul className="space-y-2">
                {links.map((label) => (
                  <li key={label}>
                    <a href="#" className="text-base text-[#b3b3b3] hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-row gap-4">
          <a
            href="https://instagram.com/spotify"
            aria-label="Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292929] hover:bg-[#3e3e3e]"
          >
            <IconInstagram className="h-4 w-4 fill-white" />
          </a>
          <a
            href="https://x.com/spotify"
            aria-label="X"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292929] hover:bg-[#3e3e3e]"
          >
            <IconX className="h-4 w-4 fill-white" />
          </a>
          <a
            href="https://www.facebook.com/Spotify"
            aria-label="Facebook"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292929] hover:bg-[#3e3e3e]"
          >
            <IconFacebook className="h-4 w-4 fill-white" />
          </a>
        </div>
      </div>

      <hr className="mb-6 border-t border-[#292929]" />

      <div className="flex gap-6 pt-4">
        <span className="text-sm text-[#b3b3b3]">&copy; 2026 Spotify AB</span>
      </div>
    </nav>
  );
}