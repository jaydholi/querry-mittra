import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  RefreshCw,
  Server,
  Trash2,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
      { title: "Diagnostics — Server Monitoring" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Health = "healthy" | "warning" | "critical";

type Sample = {
  t: number;
  uptime: number;
  errors: number;
  rss: number;
  heap: number;
  requests: number;
};

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function DiagnosticsPage() {
  const initial = Route.useLoaderData() as DiagnosticsPayload;
  const [data, setData] = useState<DiagnosticsPayload>(initial);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [samples, setSamples] = useState<Sample[]>(() => seedSamples(initial));
  const prevErrorsRef = useRef(initial.entries.length);

  const refresh = async () => {
    setLoading(true);
    try {
      const next = await getDiagnostics();
      setData(next);
      setSamples((prev) => {
        const t = Date.now();
        const newErrs = next.entries.length;
        const errorDelta = Math.max(0, newErrs - prevErrorsRef.current);
        prevErrorsRef.current = newErrs;
        const sample: Sample = {
          t,
          uptime: next.uptimeSeconds,
          errors: errorDelta,
          rss: next.memory.rssMb,
          heap: next.memory.heapUsedMb,
          requests: Math.floor(20 + Math.random() * 80),
        };
        return [...prev.slice(-29), sample];
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const envChecks = useMemo(
    () => [
      { label: "SUPABASE_URL", ok: data.env.hasSupabaseUrl, required: true },
      { label: "SUPABASE_PUBLISHABLE_KEY", ok: data.env.hasSupabasePublishableKey, required: true },
      { label: "SUPABASE_SERVICE_ROLE_KEY", ok: data.env.hasServiceRole, required: true },
      { label: "HOSTINGER", ok: data.env.hostingerFlag, required: false },
    ],
    [data.env],
  );

  const missingRequired = envChecks.filter((c) => c.required && !c.ok).length;
  const errorCount = data.entries.length;
  const health: Health =
    missingRequired > 0 || errorCount > 10
      ? "critical"
      : errorCount > 0
        ? "warning"
        : "healthy";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/20">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Server Diagnostics</h1>
              <p className="text-sm text-muted-foreground">
                Real-time monitoring and runtime health
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <HealthPill health={health} />
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/60 px-3 py-1.5 text-xs backdrop-blur">
              <span className="text-muted-foreground">Auto-refresh</span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await clearDiagnostics();
                await refresh();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </header>

        {/* Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Activity className="h-4 w-4" />}
            label="Uptime"
            value={formatUptime(data.uptimeSeconds)}
            sub={`${data.uptimeSeconds}s total`}
            accent="from-emerald-500/20 to-emerald-500/5"
          />
          <MetricCard
            icon={<Cpu className="h-4 w-4" />}
            label="Node"
            value={data.nodeVersion}
            sub={data.buildTarget}
            accent="from-sky-500/20 to-sky-500/5"
          />
          <MetricCardCount
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Errors captured"
            target={errorCount}
            sub={errorCount === 0 ? "All clear" : "Recent issues"}
            accent={
              errorCount === 0
                ? "from-emerald-500/20 to-emerald-500/5"
                : "from-amber-500/20 to-amber-500/5"
            }
          />
          <MetricCardCount
            icon={<HardDrive className="h-4 w-4" />}
            label="Heap used"
            target={data.memory.heapUsedMb}
            suffix=" MB"
            sub={`RSS ${data.memory.rssMb} MB`}
            accent="from-violet-500/20 to-violet-500/5"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Memory (MB)" icon={<HardDrive className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={samples} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-heap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString().slice(0, 5)} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip content={<ChartTip />} />
                <Area
                  type="monotone"
                  dataKey="heap"
                  stroke="hsl(var(--primary))"
                  fill="url(#g-heap)"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Error frequency" icon={<AlertTriangle className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={samples} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString().slice(0, 5)} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Activity (req/s sim.)" icon={<Zap className="h-4 w-4" />}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={samples} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString().slice(0, 5)} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip content={<ChartTip />} />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Env + activity feed */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {envChecks.map((c) => (
                <div
                  key={c.label}
                  className="group flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-3 py-2 text-xs transition-all hover:border-primary/40 hover:bg-background/70"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        c.ok ? "bg-emerald-500" : c.required ? "bg-red-500" : "bg-amber-500",
                      )}
                    />
                    {c.label}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-border/60",
                      c.ok && "border-emerald-500/40 text-emerald-500",
                      !c.ok && c.required && "border-red-500/40 text-red-500",
                      !c.ok && !c.required && "border-amber-500/40 text-amber-500",
                    )}
                  >
                    {c.ok ? "set" : c.required ? "missing" : "optional"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Activity feed
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {data.entries.length} event{data.entries.length === 1 ? "" : "s"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {loading && data.entries.length === 0 ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : data.entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-500/70" />
                    <p className="text-sm font-medium">No events recorded</p>
                    <p className="text-xs text-muted-foreground">Server is running clean.</p>
                  </div>
                ) : (
                  data.entries.map((e) => (
                    <div
                      key={e.id}
                      className="animate-fade-in rounded-md border border-border/50 bg-background/40 p-3 text-xs transition-colors hover:border-primary/40"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="border-border/60 text-[10px]">
                          {e.source}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {e.buildTarget}
                        </Badge>
                        {e.missingModule && (
                          <Badge variant="destructive" className="text-[10px]">
                            missing: {e.missingModule}
                          </Badge>
                        )}
                        {e.failingImporter && (
                          <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-500">
                            at: {e.failingImporter}
                          </Badge>
                        )}
                        <span className="ml-auto text-muted-foreground">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{e.message}</p>
                      {e.stack && (
                        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
                          {e.stack}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HealthPill({ health }: { health: Health }) {
  const map = {
    healthy: { label: "Healthy", color: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-500/30" },
    warning: { label: "Warning", color: "bg-amber-500", text: "text-amber-500", ring: "ring-amber-500/30" },
    critical: { label: "Critical", color: "bg-red-500", text: "text-red-500", ring: "ring-red-500/30" },
  }[health];
  return (
    <div className={cn("flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 backdrop-blur ring-1", map.ring)}>
      <span className="relative flex h-2 w-2">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", map.color)} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", map.color)} />
      </span>
      <span className={cn("text-xs font-medium", map.text)}>{map.label}</span>
    </div>
  );
}

function MetricCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string }) {
  return (
    <Card className={cn(
      "group relative overflow-hidden border-border/60 bg-gradient-to-br backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg",
      accent,
    )}>
      <CardContent className="p-5">
        <div className="mb-2 flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          <span className="opacity-70 transition-opacity group-hover:opacity-100">{icon}</span>
        </div>
        <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function MetricCardCount({
  icon, label, target, suffix = "", sub, accent,
}: { icon: React.ReactNode; label: string; target: number; suffix?: string; sub?: string; accent: string }) {
  const v = useCountUp(target);
  const display = Number.isInteger(target) ? Math.round(v).toString() : v.toFixed(1);
  return (
    <MetricCard icon={icon} label={label} value={display + suffix} sub={sub} accent={accent} />
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur transition-all hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-background/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur">
      <div className="text-muted-foreground">{new Date(label).toLocaleTimeString()}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.dataKey}: {p.value}
        </div>
      ))}
    </div>
  );
}

function seedSamples(d: DiagnosticsPayload): Sample[] {
  const now = Date.now();
  return Array.from({ length: 12 }).map((_, i) => ({
    t: now - (12 - i) * 3000,
    uptime: Math.max(0, d.uptimeSeconds - (12 - i) * 3),
    errors: 0,
    rss: d.memory.rssMb,
    heap: d.memory.heapUsedMb,
    requests: Math.floor(20 + Math.random() * 80),
  }));
}
