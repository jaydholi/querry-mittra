import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0f14] transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Ambient glow behind logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34,180,255,0.45) 0%, rgba(34,180,255,0.15) 35%, transparent 70%)",
        }}
      />

      <img
        src={logo}
        alt="Query Mittra — AI Chatbot"
        className="relative z-10 w-[88vw] max-w-[520px] animate-in fade-in zoom-in-95 duration-700"
        draggable={false}
      />

      <p className="relative z-10 mt-6 text-center text-xs font-medium uppercase tracking-[0.3em] text-[#7fd4ff]/80 sm:text-sm">
        Kutch's First AI Chatbot
      </p>
      <div className="relative z-10 mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#7fd4ff]/50">
        <span className="h-px w-6 bg-[#7fd4ff]/30" />
        <span>by Jay Dholi</span>
        <span className="h-px w-6 bg-[#7fd4ff]/30" />
      </div>

      <div className="absolute bottom-12 z-10 flex items-center gap-2">
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-[#22b4ff] [animation-delay:-0.3s]"
          style={{ boxShadow: "0 0 12px #22b4ff" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-[#22b4ff] [animation-delay:-0.15s]"
          style={{ boxShadow: "0 0 12px #22b4ff" }}
        />
        <div
          className="h-2 w-2 animate-bounce rounded-full bg-[#22b4ff]"
          style={{ boxShadow: "0 0 12px #22b4ff" }}
        />
      </div>
    </div>
  );
}
