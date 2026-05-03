import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getDiagnostics,
  clearDiagnostics,
  type DiagnosticsPayload,
} from "@/server/diagnostics.functions";

export const Route = createFileRoute("/admin/diagnostics")({
  component: DiagnosticsPage,
  loader: async () => await getDiagnostics(),
  head: () => ({
    meta: [
      { title: "Diagnostics — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function DiagnosticsPage() {
  const initial = Route.useLoaderData() as DiagnosticsPayload;
  const router = useRouter();
  const [data, setData] = useState<DiagnosticsPayload>(initial);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      setData(await getDiagnostics());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Server Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Recent server errors with module / import context.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await clearDiagnostics();
              router.invalidate();
              await refresh();
            }}
          >
            Clear
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Build target and environment status</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Build target" value={data.buildTarget} />
          <Stat label="Node" value={data.nodeVersion} />
          <Stat label="Uptime" value={`${data.uptimeSeconds}s`} />
          <Stat label="Errors captured" value={String(data.entries.length)} />
          <EnvBadge label="SUPABASE_URL" ok={data.env.hasSupabaseUrl} />
          <EnvBadge label="SUPABASE_PUBLISHABLE_KEY" ok={data.env.hasSupabasePublishableKey} />
          <EnvBadge label="SERVICE_ROLE" ok={data.env.hasServiceRole} />
          <EnvBadge label="HOSTINGER=1" ok={data.env.hostingerFlag} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent errors</CardTitle>
          <CardDescription>Newest first · capped at 100</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors recorded.</p>
          ) : (
            data.entries.map((e) => (
              <div
                key={e.id}
                className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{e.source}</Badge>
                  <Badge variant="secondary">{e.buildTarget}</Badge>
                  {e.missingModule && (
                    <Badge variant="destructive">missing: {e.missingModule}</Badge>
                  )}
                  {e.failingImporter && (
                    <Badge variant="outline">at: {e.failingImporter}</Badge>
                  )}
                  <span className="ml-auto text-muted-foreground">{e.timestamp}</span>
                </div>
                <p className="font-medium text-foreground">{e.message}</p>
                {e.stack && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-background p-2 font-mono text-[11px] text-muted-foreground">
                    {e.stack}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/60 bg-background p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function EnvBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded border border-border/60 bg-background p-2">
      <span className="font-mono text-[11px]">{label}</span>
      <Badge variant={ok ? "default" : "destructive"}>{ok ? "set" : "missing"}</Badge>
    </div>
  );
}
