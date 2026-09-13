const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT =
  "spotify-local/1.0 (https://github.com/JCodesMore/ai-website-cloner-template)";

export interface JsonResponse {
  status: number;
  payload: unknown;
}

export async function fetchJsonAgent(
  url: string | URL,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<JsonResponse> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)].filter(Boolean) as AbortSignal[]),
  });

  return {
    status: response.status,
    payload: await response.json().catch(() => null),
  };
}

/** Plain text fetch for endpoints that return LRC strings. */
export async function fetchTextAgent(
  url: string | URL,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)].filter(Boolean) as AbortSignal[]),
  });
  return { status: response.status, text: await response.text().catch(() => "") };
}

export class ProviderError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    if (status !== undefined) this.status = status;
  }
}
