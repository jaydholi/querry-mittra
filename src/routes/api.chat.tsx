import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `You are Querry Mittra, an AI assistant from Kutch, Gujarat, created by Jay Dholi.

Identity rules (STRICT):
- You are "Querry Mittra – AI Assistant from Kutch".
- Never mention Gemini, OpenAI, Google, Anthropic, API providers, models, or any backend technology.
- If asked who built you, say: "I was created by Jay Dholi from Kutch, Gujarat."

Answer rules (STRICT):
- Keep answers SHORT: max 120-150 words by default.
- Do NOT use the asterisk character "*" anywhere in your response. For emphasis use plain text. For lists use "- " hyphens.
- Use clean formatting: short paragraphs, line breaks, hyphen bullets when listing.
- Avoid repeating information or filler phrases.
- If the user explicitly asks for a long/detailed answer, you may exceed the limit.
- If the user asks for code: return ONLY the code in a fenced block, no explanation before or after.
- If the user asks for a caption / prompt / tagline / message: return ONLY the ready-to-use text, no preamble.
- Ask a follow-up only when truly necessary to answer.
- Be friendly, direct, and professional.`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          if (!auth?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }
          const token = auth.slice(7);

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }

          const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { data: claims } = await supabase.auth.getClaims(token);
          const userId = claims?.claims?.sub;
          if (!userId) {
            return new Response(JSON.stringify({ error: "Invalid session" }), {
              status: 401,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }

          const body = (await request.json()) as {
            sessionId: string;
            userMessage: string;
          };
          const { sessionId, userMessage } = body;
          if (!sessionId || !userMessage?.trim()) {
            return new Response(JSON.stringify({ error: "Missing fields" }), {
              status: 400,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }
          if (userMessage.length > 8000) {
            return new Response(JSON.stringify({ error: "Message too long" }), {
              status: 400,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }

          // Verify session belongs to user
          const { data: sess, error: sessErr } = await supabase
            .from("chat_sessions")
            .select("id, title")
            .eq("id", sessionId)
            .maybeSingle();
          if (sessErr || !sess) {
            return new Response(JSON.stringify({ error: "Session not found" }), {
              status: 404,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }

          // Save user message
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            user_id: userId,
            role: "user",
            content: userMessage.trim(),
          });

          // Load history (last 30 messages for context/memory)
          const { data: history } = await supabase
            .from("chat_messages")
            .select("role, content")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })
            .limit(30);

          const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
          ];

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages,
              stream: true,
            }),
          });

          if (!aiResp.ok || !aiResp.body) {
            const text = await aiResp.text().catch(() => "");
            console.error("AI gateway error", aiResp.status, text);
            const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
            const error =
              status === 429
                ? "Too many requests. Please wait a moment."
                : status === 402
                ? "AI credits exhausted. Please add credits in workspace settings."
                : "AI service unavailable.";
            return new Response(JSON.stringify({ error }), {
              status,
              headers: { ...corsHeaders(), "Content-Type": "application/json" },
            });
          }

          // Pipe stream + capture full text to save assistant message at end
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let fullText = "";
          let isFirst = true;

          const stream = new ReadableStream({
            async start(controller) {
              const reader = aiResp.body!.getReader();
              let buf = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  let idx: number;
                  while ((idx = buf.indexOf("\n")) !== -1) {
                    let line = buf.slice(0, idx);
                    buf = buf.slice(idx + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) {
                      controller.enqueue(encoder.encode(line + "\n"));
                      continue;
                    }
                    const json = line.slice(6).trim();
                    if (json === "[DONE]") {
                      controller.enqueue(encoder.encode(line + "\n"));
                      continue;
                    }
                    try {
                      const parsed = JSON.parse(json);
                      const content: string | undefined =
                        parsed.choices?.[0]?.delta?.content;
                      if (content) {
                        // Strip asterisks defensively
                        const clean = content.replace(/\*/g, "");
                        fullText += clean;
                        const out = {
                          choices: [{ delta: { content: clean } }],
                        };
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify(out)}\n`)
                        );
                        isFirst = false;
                      } else {
                        controller.enqueue(encoder.encode(line + "\n"));
                      }
                    } catch {
                      buf = line + "\n" + buf;
                      break;
                    }
                  }
                }
                // Save assistant message
                if (fullText.trim()) {
                  await supabase.from("chat_messages").insert({
                    session_id: sessionId,
                    user_id: userId,
                    role: "assistant",
                    content: fullText.trim(),
                  });
                  // Update session title from first user msg if still default
                  if (sess.title === "New chat") {
                    const newTitle = userMessage.trim().slice(0, 60);
                    await supabase
                      .from("chat_sessions")
                      .update({ title: newTitle })
                      .eq("id", sessionId);
                  } else {
                    await supabase
                      .from("chat_sessions")
                      .update({ updated_at: new Date().toISOString() })
                      .eq("id", sessionId);
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n"));
                controller.close();
              } catch (e) {
                console.error("stream error", e);
                controller.error(e);
              }
              void isFirst; // silence unused
            },
          });

          return new Response(stream, {
            headers: {
              ...corsHeaders(),
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (e) {
          console.error("chat handler error", e);
          return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
