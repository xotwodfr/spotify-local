import { lyricsCacheClear, lyricsCacheSize } from "@/app/api/lyrics/cache-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ tracked: lyricsCacheSize() });
}

export async function DELETE() {
  const cleared = lyricsCacheClear();
  return Response.json({ cleared });
}