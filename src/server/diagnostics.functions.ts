import { createServerFn } from "@tanstack/react-start";
import {
  getBuildTarget,
  listEntries,
  clearEntries,
  recordError,
  type DiagEntry,
} from "./diagnostics.server";
import { seedSampleDiagnostics } from "./diagnostics.seed";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type HealthCheck = {
  name: string;
  ok: boolean;
  detail: string;
  latencyMs?: number;
};

export type DiagnosticsPayload = {
  buildTarget: string;
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  startedAt: string;
  entries: DiagEntry[];
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  env: {
    hasSupabaseUrl: boolean;
    hasSupabasePublishableKey: boolean;
    hasServiceRole: boolean;
    hostingerFlag: boolean;
  };
  checks: HealthCheck[];
  counters: {
    totalErrors: number;
    requestsServed: number;
  };
};

const startedAtMs = Date.now();
let requestsServed = 0;

async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // 1. Required env vars
  const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  checks.push({
    name: "Required environment",
    ok: missing.length === 0,
    detail: missing.length === 0 ? "All required vars present" : `Missing: ${missing.join(", ")}`,
  });

  // 2. Optional HOSTINGER flag (never an error)
  checks.push({
    name: "Optional HOSTINGER flag",
    ok: true,
    detail: process.env.HOSTINGER === "1" ? "Enabled" : "Disabled (default)",
  });

  // 3. Supabase ping
  const t0 = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);
    if (error) throw error;
    checks.push({
      name: "Database connection",
      ok: true,
      detail: "Connected to backend",
      latencyMs: Date.now() - t0,
    });
  } catch (e) {
    checks.push({
      name: "Database connection",
      ok: false,
      detail: e instanceof Error ? e.message : "Unknown error",
      latencyMs: Date.now() - t0,
    });
  }

  // 4. Memory headroom
  try {
    const m = process.memoryUsage();
    const usedPct = (m.heapUsed / m.heapTotal) * 100;
    checks.push({
      name: "Memory headroom",
      ok: usedPct < 90,
      detail: `${usedPct.toFixed(1)}% heap used`,
    });
  } catch {
    checks.push({ name: "Memory headroom", ok: true, detail: "Not measurable in this runtime" });
  }

  return checks;
}

export const getDiagnostics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiagnosticsPayload> => {
    seedSampleDiagnostics();
    requestsServed += 1;

    let memory = { rssMb: 0, heapUsedMb: 0, heapTotalMb: 0 };
    try {
      const m = process.memoryUsage();
      memory = {
        rssMb: +(m.rss / 1024 / 1024).toFixed(1),
        heapUsedMb: +(m.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMb: +(m.heapTotal / 1024 / 1024).toFixed(1),
      };
    } catch { /* runtime may not support */ }

    const checks = await runHealthChecks();
    const entries = listEntries();

    return {
      buildTarget: getBuildTarget(),
      nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
      platform: typeof process !== "undefined" ? process.platform : "unknown",
      uptimeSeconds:
        typeof process?.uptime === "function" ? Math.floor(process.uptime()) : 0,
      startedAt: new Date(startedAtMs).toISOString(),
      entries,
      memory,
      env: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabasePublishableKey: !!process.env.SUPABASE_PUBLISHABLE_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hostingerFlag: process.env.HOSTINGER === "1",
      },
      checks,
      counters: {
        totalErrors: entries.length,
        requestsServed,
      },
    };
  },
);

export const clearDiagnostics = createServerFn({ method: "POST" }).handler(
  async () => {
    clearEntries();
    return { ok: true };
  },
);

// Expose a manual record entry point so client errors / try/catch blocks
// can forward problems into the same buffer.
export const reportError = createServerFn({ method: "POST" })
  .inputValidator((d: { message: string; stack?: string }) => d)
  .handler(async ({ data }) => {
    const err = new Error(data.message);
    if (data.stack) err.stack = data.stack;
    return recordError(err, "manual");
  });

// Trigger a sample test error on demand to verify capture pipeline.
export const triggerTestError = createServerFn({ method: "POST" }).handler(
  async () => {
    const err = new Error(
      `Synthetic test error from /admin/diagnostics at ${new Date().toISOString()}`,
    );
    return recordError(err, "manual");
  },
);
