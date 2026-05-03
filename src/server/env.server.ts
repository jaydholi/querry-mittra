// Centralized server env validation.
// - Required vars throw a clear error when missing.
// - Optional vars (like HOSTINGER) silently default and never warn.

export type ServerEnv = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  HOSTINGER: boolean;
  BUILD_TARGET: string;
  NODE_ENV: string;
};

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const missing: string[] = [];
  for (const k of REQUIRED) {
    if (!process.env[k]) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Set them in your hosting provider's environment configuration.`,
    );
  }

  cached = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    HOSTINGER: process.env.HOSTINGER === "1",
    BUILD_TARGET: process.env.BUILD_TARGET ?? "",
    NODE_ENV: process.env.NODE_ENV ?? "development",
  };
  return cached;
}

/** Safe boolean accessor that never throws — use in non-critical paths. */
export const isHostinger = (): boolean => process.env.HOSTINGER === "1";

/** Build target string, with sensible fallbacks. Never throws. */
export function getBuildTarget(): string {
  if (process.env.BUILD_TARGET) return process.env.BUILD_TARGET;
  if (isHostinger()) return "node (hostinger)";
  if (process.env.CF_PAGES || process.env.CLOUDFLARE_WORKERS) return "cloudflare";
  return process.env.NODE_ENV === "production" ? "node" : "node (dev)";
}

let logged = false;
/** Pretty startup log: required vars loaded ✓, optional vars listed informationally. */
export function logEnvStatus() {
  if (logged) return;
  logged = true;

  const lines: string[] = ["[env] startup configuration"];
  for (const k of REQUIRED) {
    lines.push(`  ✓ ${k}: ${process.env[k] ? "loaded" : "MISSING"}`);
  }
  lines.push(
    `  • HOSTINGER (optional): ${
      process.env.HOSTINGER ? process.env.HOSTINGER : "not set (default false)"
    }`,
  );
  lines.push(`  • BUILD_TARGET: ${getBuildTarget()}`);
  lines.push(`  • NODE_ENV: ${process.env.NODE_ENV ?? "development"}`);
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}
