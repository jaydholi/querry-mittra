import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BrandHeader } from "@/components/brand-header";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { getSafeNextPath } from "@/lib/auth-redirect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile — Querry Mittra" }, { name: "description", content: "Manage your Querry Mittra account." }],
  }),
  component: ProfilePage,
});

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  notifications_enabled: boolean;
};

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({
        to: "/auth",
        search: { next: getSafeNextPath(window.location.pathname + window.location.search, window.location.pathname) },
        replace: true,
      });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, email, notifications_enabled")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        setProfile(
          data ?? {
            display_name: user.user_metadata?.full_name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
            email: user.email ?? null,
            notifications_enabled: true,
          },
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setBusy(false);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: profile.email,
          display_name: profile.display_name?.trim().slice(0, 80) || null,
          avatar_url: profile.avatar_url?.trim().slice(0, 1000) || null,
          notifications_enabled: profile.notifications_enabled,
        });
      if (error) throw error;
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      // Delete the profile row; auth.users requires admin. We sign out and inform.
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.from("chat_sessions").delete().eq("user_id", user.id);
      toast.success("Your data was removed. Signing you out.");
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (loading || !user || busy || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <BrandHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => navigate({ to: "/chat" })}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to chat
        </button>

        <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-card backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-xl font-semibold text-primary-foreground">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                (profile.display_name ?? profile.email ?? "?").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{profile.display_name ?? profile.email}</h1>
              <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={profile.display_name ?? ""}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                maxLength={80}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={profile.avatar_url ?? ""}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://…"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-muted-foreground">Paste an image URL.</p>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile.email ?? ""} disabled />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-3">
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Receive product updates and tips.</p>
              </div>
              <Switch
                checked={profile.notifications_enabled}
                onCheckedChange={(v) => setProfile({ ...profile, notifications_enabled: v })}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving} className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save changes
            </Button>
            <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/", replace: true }); }}>
              Sign out
            </Button>
            <div className="ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="mr-1 h-4 w-4" /> Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes your profile and all your chats. You will be signed out.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
