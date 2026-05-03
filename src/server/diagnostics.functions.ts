import { createServerFn } from "@tanstack/react-start";
import {
  getBuildTarget,
  listEntries,
  clearEntries,
  recordError,
  type DiagEntry,
} from "./diagnostics.server";

export type DiagnosticsPayload = {
  buildTarget: string;
  nodeVersion: string;
  uptimeSeconds: number;
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
};

export const getDiagnostics = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiagnosticsPayload> => {
    let memory = { rssMb: 0, heapUsedMb: 0, heapTotalMb: 0 };
    try {
      const m = process.memoryUsage();
      memory = {
        rssMb: +(m.rss / 1024 / 1024).toFixed(1),
        heapUsedMb: +(m.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMb: +(m.heapTotal / 1024 / 1024).toFixed(1),
      };
    } catch { /* runtime may not support */ }

    return {
      buildTarget: getBuildTarget(),
      nodeVersion: typeof process !== "undefined" ? process.version : "unknown",
      uptimeSeconds:
        typeof process?.uptime === "function" ? Math.floor(process.uptime()) : 0,
      entries: listEntries(),
      memory,
      env: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabasePublishableKey: !!process.env.SUPABASE_PUBLISHABLE_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hostingerFlag: process.env.HOSTINGER === "1",
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
