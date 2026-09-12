import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { NowPlayingBar } from "@/components/now-playing-bar";
import { RailSection } from "@/components/rail-section";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { rails } from "@/lib/catalog";

export default function Home() {
  return (
    <div className="grid h-full w-full grid-cols-[320px_1fr_32px] grid-rows-[64px_1fr_82px] gap-2 bg-black p-2 text-white max-lg:grid-cols-1">
      <div className="col-span-full">
        <TopBar />
      </div>

      <div className="flex max-lg:hidden">
        <Sidebar />
      </div>

      <main className="relative overflow-hidden rounded-lg bg-[#121212]">
        <div className="relative h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-64 bg-[linear-gradient(rgba(0,0,0,0.6)_0%,rgb(18,18,18)_100%)]"
          />
          <div className="relative">
            <section className="px-10 pb-8 pt-1">
              <h1 className="sr-only">Home</h1>
              {rails.map((rail) => (
                <RailSection key={rail.id} rail={rail} />
              ))}
            </section>
            <Footer />
          </div>
        </div>
      </main>

      <div className="rounded-lg bg-[#121212] max-xl:hidden" />

      <div className="col-span-full">
        <NowPlayingBar />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 hidden max-lg:flex">
        <MobileNav />
      </div>
    </div>
  );
}