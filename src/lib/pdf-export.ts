// Minimal printable PDF export (no external deps).
// Opens a print-ready window with a permanent watermark.
import type { ExportMessage } from "./export";

export function jsPDFLikeExport(title: string, messages: ExportMessage[]) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;

  const safeTitle = escapeHtml(title);
  const rows = messages
    .map((m) => {
      const who = m.role === "user" ? "You" : "Querry Mittra";
      const ts = new Date(m.created_at).toLocaleString();
      return `<div class="msg ${m.role}">
        <div class="meta"><strong>${who}</strong> · <span>${escapeHtml(ts)}</span></div>
        <div class="content">${escapeHtml(m.content)}</div>
      </div>`;
    })
    .join("");

  w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${safeTitle} — Querry Mittra</title>
<style>
  @page { margin: 18mm; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; line-height: 1.5; position: relative; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 18px; }
  .msg { margin: 12px 0; padding: 10px 12px; border-radius: 8px; page-break-inside: avoid; }
  .msg.user { background: #eef6ff; }
  .msg.assistant { background: #f5f5f5; }
  .meta { font-size: 11px; color: #555; margin-bottom: 4px; }
  .content { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; }
  .watermark {
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
  }
  .watermark span {
    transform: rotate(-30deg);
    font-size: 64px; color: rgba(20,120,200,0.10);
    font-weight: 800; letter-spacing: 4px; user-select: none;
  }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
</style></head>
<body>
  <div class="watermark"><span>Querry Mittra · Jay Dholi</span></div>
  <h1>${safeTitle}</h1>
  <div class="sub">Exported from Querry Mittra · ${escapeHtml(new Date().toLocaleString())}</div>
  ${rows}
  <div class="footer">Querry Mittra — Jay Dholi · AI Assistant from Kutch</div>
  <script>window.onload = () => { setTimeout(() => window.print(), 250); };</script>
</body></html>`);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
