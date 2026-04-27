import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(() => onDone(), 2700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background bg-hero-gradient transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-3xl bg-primary/30 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-gradient shadow-glow">
          <Sparkles className="h-12 w-12 text-primary-foreground" />
        </div>
      </div>

      <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
        Querry <span className="text-brand-gradient">Mittra</span>
      </h1>

      <p className="mt-3 text-center text-sm font-medium text-muted-foreground sm:text-base">
        Kutch's First Developed AI Chatbot
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px w-6 bg-border" />
        <span>by Jay Dholi</span>
        <span className="h-px w-6 bg-border" />
      </div>

      <div className="absolute bottom-10 flex items-center gap-2">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
      </div>
    </div>
  );
}
