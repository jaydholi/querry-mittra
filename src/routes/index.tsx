import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bolt, Brain, Download, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandHeader } from "@/components/brand-header";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Querry Mittra — AI Assistant from Kutch" },
      { name: "description", content: "Smart, fast, reliable AI assistant. Get clear answers in seconds. Built by Jay Dholi from Kutch, Gujarat." },
      { property: "og:title", content: "Querry Mittra — AI Assistant from Kutch" },
      { property: "og:description", content: "Smart • Fast • Reliable AI assistant by Jay Dholi." },
    ],
  }),
  component: Landing,
});

const examples = [
  "Write a 30-word Instagram caption for chai lovers",
  "Explain quantum computing in 4 lines",
  "Generate a cold email to pitch a SaaS product",
  "Give me a healthy 7-day breakfast plan",
];

const features = [
  { icon: Bolt, title: "Lightning fast", desc: "Streaming answers in milliseconds." },
  { icon: Brain, title: "Smart memory", desc: "Remembers your conversations." },
  { icon: Download, title: "Export chats", desc: "Save as PDF or text, watermarked." },
  { icon: Lock, title: "Secure & private", desc: "Your data stays yours." },
];

function TypingDemo() {
  const phrases = [
    "Hi, I'm Querry Mittra.",
    "Ask me anything.",
    "Smart, fast, reliable.",
  ];
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const target = phrases[i];
    const speed = del ? 35 : 70;
    const t = setTimeout(() => {
      if (!del && text === target) {
        setTimeout(() => setDel(true), 1200);
        return;
      }
      if (del && text === "") {
        setDel(false);
        setI((v) => (v + 1) % phrases.length);
        return;
      }
      setText(del ? target.slice(0, text.length - 1) : target.slice(0, text.length + 1));
    }, speed);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, del, i]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        Querry Mittra is typing
      </div>
      <p className="mt-3 min-h-[2rem] text-base font-medium">
        {text}
        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary animate-blink" />
      </p>
    </div>
  );
}

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goChat = (prompt?: string) => {
    if (!user) {
      navigate({ to: "/auth", search: prompt ? { prompt } : undefined });
    } else {
      navigate({ to: "/chat", search: prompt ? { prompt } : undefined });
    }
  };

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <BrandHeader
        rightSlot={
          user ? (
            <Button asChild size="sm" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              <Link to="/chat">Open chat</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              <Link to="/auth">Sign in</Link>
            </Button>
          )
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" /> AI Assistant from Kutch, Gujarat
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Querry <span className="text-brand-gradient">Mittra</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Smart • Fast • Reliable
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            A premium AI assistant that gives you clear, concise answers — without the fluff.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              onClick={() => goChat()}
              className="bg-brand-gradient text-primary-foreground shadow-glow hover:opacity-90"
            >
              Start chatting <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Explore features</a>
            </Button>
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <TypingDemo />
          </div>
        </section>

        {/* Examples */}
        <section className="mt-16">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Try an example
          </h2>
          <div className="mx-auto mt-5 grid max-w-3xl gap-2 sm:grid-cols-2">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => goChat(ex)}
                className="group rounded-xl border border-border/60 bg-card/50 p-4 text-left text-sm transition-all hover:border-primary/60 hover:bg-card hover:shadow-glow"
              >
                <span className="text-muted-foreground group-hover:text-foreground">{ex}</span>
                <ArrowRight className="float-right mt-0.5 h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-20">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Built for <span className="text-brand-gradient">real conversations</span>
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient/20 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Querry Mittra · Built with care by Jay Dholi, Kutch
        </footer>
      </main>
    </div>
  );
}
