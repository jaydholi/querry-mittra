export type AuthRedirectSearch = {
  next?: string;
  prompt?: string;
};

export function getSafeNextPath(next?: string | null, fallback = "/chat") {
  if (!next) return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function getPostAuthRedirectPath({ next, prompt }: AuthRedirectSearch = {}) {
  const safeNext = getSafeNextPath(next, "/chat");
  const url = new URL(safeNext, "https://querry-mittra.local");

  if (url.pathname === "/chat" && prompt?.trim()) {
    url.searchParams.set("prompt", prompt.trim());
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildAuthCallbackUrl({
  origin,
  next,
  prompt,
}: AuthRedirectSearch & { origin: string }) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", getSafeNextPath(next, "/chat"));

  if (prompt?.trim()) {
    url.searchParams.set("prompt", prompt.trim());
  }

  return url.toString();
}
