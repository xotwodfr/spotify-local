import { clearServerSession, getServerSession } from "@/lib/navidrome/server-session";

export async function GET() {
  const session = await getServerSession();
  return Response.json({
    connected: Boolean(session),
    url: session?.url ?? "",
    name: session?.name ?? "",
    defaultUrl:
      process.env.NEXT_PUBLIC_NAVIDROME_URL ?? process.env.NAVIDROME_URL ?? "",
  });
}

export async function DELETE() {
  await clearServerSession();
  return Response.json({ ok: true });
}