// Server-only diagnostics: in-memory ring buffer that captures unhandled
// errors with extra context (missing module name, failing import path,
// build target). Survives across requests within a single server process.

export type DiagEntry = {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  /** Parsed module name from "Cannot find module 'X'" / "Failed to resolve import 'X'" */
  missingModule?: string;
  /** The file that tried to do the import, when we can extract it */
  failingImporter?: string;
  /** node | cloudflare | unknown */
  buildTarget: string;
  source: "uncaughtException" | "unhandledRejection" | "manual";
};

const MAX_ENTRIES = 100;
const buffer: DiagEntry[] = [];
let installed = false;

import { getBuildTarget, logEnvStatus } from "./env.server";
export { getBuildTarget } from "./env.server";
try { logEnvStatus(); } catch { /* never block startup on logging */ }

const MODULE_PATTERNS: RegExp[] = [
  /Cannot find module ['"`]([^'"`]+)['"`]/i,
  /Failed to resolve import ['"`]([^'"`]+)['"`]/i,
  /Module not found:.*['"`]([^'"`]+)['"`]/i,
  /Error: Cannot find package ['"`]([^'"`]+)['"`]/i,
  /\[unenv\] (\S+) is not implemented/i,
];

const IMPORTER_PATTERNS: RegExp[] = [
  /from ['"`]?([^\s'"`]+\.[tj]sx?)['"`]?/i,
  /imported from ['"`]?([^\s'"`]+)['"`]?/i,
  /at ([^\s()]+\.[tj]sx?):\d+/,
];

function parseModuleInfo(message: string, stack?: string) {
  const haystack = `${message}\n${stack ?? ""}`;
  let missingModule: string | undefined;
  for (const re of MODULE_PATTERNS) {
    const m = haystack.match(re);
    if (m) {
      missingModule = m[1];
      break;
    }
  }
  let failingImporter: string | undefined;
  for (const re of IMPORTER_PATTERNS) {
    const m = haystack.match(re);
    if (m) {
      failingImporter = m[1];
      break;
    }
  }
  return { missingModule, failingImporter };
}

export function recordError(
  err: unknown,
  source: DiagEntry["source"] = "manual",
) {
  const e =
    err instanceof Error
      ? err
      : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const { missingModule, failingImporter } = parseModuleInfo(e.message, e.stack);
  const entry: DiagEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    message: e.message,
    stack: e.stack,
    missingModule,
    failingImporter,
    buildTarget: getBuildTarget(),
    source,
  };
  buffer.unshift(entry);
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES;
  // Also log so it shows up in regular server logs.
  // eslint-disable-next-line no-console
  console.error(
    `[diagnostics] ${entry.buildTarget} ${entry.source} ${
      entry.missingModule ? `missing=${entry.missingModule} ` : ""
    }${entry.failingImporter ? `at=${entry.failingImporter} ` : ""}${entry.message}`,
  );
  return entry;
}

export function listEntries(): DiagEntry[] {
  return buffer.slice();
}

export function clearEntries() {
  buffer.length = 0;
}

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;
  if (typeof process !== "undefined" && typeof process.on === "function") {
    try {
      process.on("uncaughtException", (err) => recordError(err, "uncaughtException"));
      process.on("unhandledRejection", (err) => recordError(err, "unhandledRejection"));
    } catch {
      // ignore – not supported in this runtime
    }
  }
}

// Auto-install on first import on the server.
installGlobalErrorHandlers();
