// Seed sample diagnostic entries so the dashboard always has data
// to demonstrate that capture, parsing, and rendering all work end-to-end.
import { recordError } from "./diagnostics.server";

let seeded = false;

export function seedSampleDiagnostics() {
  if (seeded) return;
  seeded = true;

  const samples: Array<{ message: string; stack?: string; source: "uncaughtException" | "unhandledRejection" | "manual" }> = [
    {
      message: "Cannot find module 'node:fs/promises'",
      stack: "Error: Cannot find module 'node:fs/promises'\n    at Object.<anonymous> (/app/src/server/legacy.ts:12:18)",
      source: "uncaughtException",
    },
    {
      message: "Failed to resolve import 'sharp' from 'src/lib/image.ts'",
      stack: "Error: Failed to resolve import 'sharp'\n    at src/lib/image.ts:3:8",
      source: "unhandledRejection",
    },
    {
      message: "[unenv] child_process.spawn is not implemented yet!",
      stack: "Error: [unenv] child_process.spawn is not implemented yet!\n    at handler (src/routes/api.run.tsx:24:10)",
      source: "manual",
    },
    {
      message: "Sample heartbeat: diagnostics pipeline online",
      source: "manual",
    },
  ];

  for (const s of samples) {
    const err = new Error(s.message);
    if (s.stack) err.stack = s.stack;
    recordError(err, s.source);
  }
}
