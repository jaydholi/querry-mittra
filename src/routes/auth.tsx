import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandHeader } from "@/components/brand-header";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { buildAuthCallbackUrl, getPostAuthRedirectPath, getSafeNextPath } from "@/lib/auth-redirect";

type AuthSearch = { prompt?: string; next?: string };

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Querry Mittra" },
      { name: "description", content: "Sign in to chat with Querry Mittra." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6).max(100);

function AuthPage() {
  const { user, loading, isAuthCallback } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !isAuthCallback) {
      const destination = getPostAuthRedirectPath({
        next: search.next,
        prompt: search.prompt,
      });
      window.location.replace(destination);
    }
  }, [user, loading, isAuthCallback, navigate, search.next, search.prompt]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const redirectUri = origin
        ? buildAuthCallbackUrl({
            origin,
            next: getSafeNextPath(search.next, "/chat"),
            prompt: search.prompt,
          })
        : undefined;

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        window.location.replace(
          getPostAuthRedirectPath({ next: search.next, prompt: search.prompt }),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
      setBusy(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch {
      toast.error("Enter a valid email and a password (6+ chars)");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? buildAuthCallbackUrl({
                    origin: window.location.origin,
                    next: getSafeNextPath(search.next, "/chat"),
                    prompt: search.prompt,
                  })
                : undefined,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <BrandHeader />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-card backdrop-blur-md">
          <h1 className="text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue chatting with Querry Mittra."
              : "Start chatting in seconds."}
          </p>

          <Button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            variant="outline"
            className="mt-5 w-full"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.5 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13.1-5l-6.1-5c-2 1.4-4.4 2.2-7 2.2-5.2 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.2 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.1 5c-.4.4 6.6-4.8 6.6-14.4 0-1.2-.1-2.4-.4-3.5z"/></svg>
            )}
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or {mode === "signin" ? "sign in" : "sign up"} with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={80} />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" maxLength={255} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" maxLength={100} required />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-brand-gradient text-primary-foreground hover:opacity-90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

        <Link to="/" className="mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
