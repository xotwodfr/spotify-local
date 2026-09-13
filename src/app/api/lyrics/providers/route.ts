import { availableProviders } from "@/lib/lyrics/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = availableProviders();
  return Response.json({
    default: "auto",
    providers: [
      { id: "auto", name: "Automatic", description: "Best available", wordSync: false, available: true },
      ...providers,
    ],
  });
}
