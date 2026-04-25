import { jsPDFLikeExport } from "./pdf-export";

export type ExportMessage = { role: "user" | "assistant"; content: string; created_at: string };

export function exportAsText(title: string, messages: ExportMessage[]) {
  const ts = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`Querry Mittra — Jay Dholi`);
  lines.push(`Chat: ${title}`);
  lines.push(`Exported: ${ts}`);
  lines.push("=".repeat(50));
  lines.push("");
  for (const m of messages) {
    const who = m.role === "user" ? "You" : "Querry Mittra";
    lines.push(`[${new Date(m.created_at).toLocaleString()}] ${who}:`);
    lines.push(m.content);
    lines.push("");
  }
  lines.push("=".repeat(50));
  lines.push(`Querry Mittra — Jay Dholi`);
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  download(blob, sanitize(title) + ".txt");
}

export function exportAsPdf(title: string, messages: ExportMessage[]) {
  jsPDFLikeExport(title, messages);
}

function sanitize(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "chat";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
