import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandHeader } from "@/components/brand-header";
import { supabase } from "@/integrations/supabase/client";
import { getPostAuthRedirectPath, type AuthRedirectSearch } from "@/lib/auth-redirect";

type AuthCallbackSearch = AuthRedirectSearch & {
  code?: string;
  error?: string;
  error_description?: string;
};

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — Querry Mittra" },
      { name: "description", content: "Completing your Querry Mittra sign-in." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): AuthCallbackSearch => ({
    next: typeof search.next === "string" ? search.next : undefined,
    prompt: typeof search.prompt === "string" ? search.prompt : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  component: AuthCallbackPage,
});

function buildAuthRetryUrl(next?: string, prompt?: string) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (prompt) params.set("prompt", prompt);
  const query = params.toString();
  return query ? `/auth?${query}` : "/auth";
}

function AuthCallbackPage() {
  const search = Route.useSearch();
  const [statusText, setStatusText] = useState("Completing sign-in...");

  const destination = useMemo(
    () => getPostAuthRedirectPath({ next: search.next, prompt: search.prompt }),
    [search.next, search.prompt],
  );

  useEffect(() => {
    let active = true;

    const finish = async () => {
      try {
        if (search.error) {
          throw new Error(search.error_description || search.error);
        }

        const url = new URL(window.location.href);
        const hasOAuthCode = Boolean(search.code || url.searchParams.get("code"));
        const hasTokenFragment = /access_token=|refresh_token=|type=recovery/.test(
          window.location.hash,
        );

        if (hasOAuthCode) {
          setStatusText("Verifying your sign-in...");
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        } else if (hasTokenFragment) {
          setStatusText("Restoring your session...");
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error("We could not complete your sign-in. Please try again.");

        if (!active) return;
        window.location.replace(destination);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Sign-in failed";
        toast.error(message);
        window.location.replace(buildAuthRetryUrl(search.next, search.prompt));
      }
    };

    void finish();

    return () => {
      active = false;
    };
  }, [destination, search.error, search.error_description, search.next, search.prompt, search.code]);

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <BrandHeader />
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="w-full rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-card backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Signing you in</h1>
          <p className="mt-2 text-sm text-muted-foreground">{statusText}</p>
        </div>
      </main>
    </div>
  );
}
