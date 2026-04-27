import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Send,
  Trash2,
  Pencil,
  Sparkles,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Download,
  FileText,
  FileDown,
  Loader2,
  Settings as SettingsIcon,
  Copy,
  RefreshCw,
  Check,
  StopCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useSettings, playBeep } from "@/lib/settings-context";
import { SettingsDialog } from "@/components/settings-dialog";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import {
  ChatMessage,
  ChatSession,
  createSession,
  deleteSession,
  listMessages,
  listSessions,
  renameSession,
  streamChat,
} from "@/lib/chat-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportAsPdf, exportAsText } from "@/lib/export";

type ChatSearch = { prompt?: string };

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Querry Mittra" },
      { name: "description", content: "Chat with Querry Mittra, your AI assistant from Kutch." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): ChatSearch => ({
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user, loading, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settings = useSettings();
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedPromptRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  // Load sessions on auth ready
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await listSessions();
        setSessions(list);
        if (list.length > 0) {
          setActiveId(list[0].id);
        } else {
          const s = await createSession();
          setSessions([s]);
          setActiveId(s.id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load chats");
      }
    })();
  }, [user]);

  // Load messages when active changes
  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const ms = await listMessages(activeId);
        setMessages(ms);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load messages");
      }
    })();
  }, [activeId]);

  // If a prompt was passed in the URL, prefill once active session is ready
  useEffect(() => {
    if (initializedPromptRef.current) return;
    if (!activeId || !search.prompt) return;
    initializedPromptRef.current = true;
    setInput(search.prompt);
    // clear search param
    navigate({ to: "/chat", replace: true });
  }, [activeId, search.prompt, navigate]);

  // Autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  const newChat = async () => {
    try {
      const s = await createSession();
      setSessions((prev) => [s, ...prev]);
      setActiveId(s.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeId === id) {
        if (remaining[0]) setActiveId(remaining[0].id);
        else {
          const s = await createSession();
          setSessions([s]);
          setActiveId(s.id);
          setMessages([]);
        }
      }
      toast.success("Chat deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const newTitle = renameValue.trim().slice(0, 80);
    if (!newTitle) return;
    try {
      await renameSession(renameTarget.id, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === renameTarget.id ? { ...s, title: newTitle } : s)),
      );
      toast.success("Renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setRenameTarget(null);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content || !activeId || busy) return;
    setBusy(true);

    const tempUserMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const tempAsstMsg: ChatMessage = {
      id: "a-" + Date.now(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg, tempAsstMsg]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      let acc = "";
      await streamChat(
        activeId,
        content,
        (chunk) => {
          acc += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAsstMsg.id ? { ...m, content: acc } : m)),
          );
        },
        ctrl.signal,
      );
      const list = await listSessions();
      setSessions(list);
      const ms = await listMessages(activeId);
      setMessages(ms);
      if (settings.soundOn) playBeep();
    } catch (e) {
      const isAbort = (e as Error)?.name === "AbortError";
      if (isAbort) {
        toast.info("Stopped");
      } else {
        const msg = e instanceof Error ? e.message : "Failed to send";
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== tempAsstMsg.id));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    await sendMessage(content);
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const regenerate = async () => {
    if (busy || messages.length === 0) return;
    // find last user message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const userMsg = messages[idx];
    // trim to before last user turn so server reprocesses
    setMessages(messages.slice(0, idx));
    await sendMessage(userMsg.content);
  };

  const clearAllChats = async () => {
    try {
      for (const s of sessions) {
        await deleteSession(s.id);
      }
      const fresh = await createSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
      setMessages([]);
      toast.success("All chats cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterSends = settings.enterToSend ? !e.shiftKey : e.shiftKey;
    if (e.key === "Enter" && enterSends) {
      e.preventDefault();
      send();
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const SuggestedPrompts = () => (
    <div className="mx-auto grid w-full max-w-xl gap-2 sm:grid-cols-2">
      {[
        "Write a short Instagram caption about Kutch",
        "Give me 5 startup ideas for India",
        "Explain blockchain in 3 lines",
        "Create a daily morning routine",
      ].map((p) => (
        <button
          key={p}
          onClick={() => setInput(p)}
          className="rounded-xl border border-border/60 bg-card/50 p-3 text-left text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          {p}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Query Mittra" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold">Query Mittra</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3">
          <Button onClick={newChat} className="w-full bg-brand-gradient text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New chat
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                activeId === s.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60"
              }`}
            >
              <button
                onClick={() => {
                  setActiveId(s.id);
                  setSidebarOpen(false);
                }}
                className="min-w-0 flex-1 truncate text-left"
                title={s.title}
              >
                {s.title}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameTarget(s);
                  setRenameValue(s.title);
                }}
                className="rounded p-1 opacity-0 transition-opacity hover:bg-sidebar-accent group-hover:opacity-100"
                aria-label="Rename"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(s);
                }}
                className="rounded p-1 text-destructive opacity-0 transition-opacity hover:bg-destructive/15 group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-sidebar-accent">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-primary-foreground">
                  {(user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{user.user_metadata?.full_name ?? user.email}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                <UserIcon className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggle}>
                {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                Toggle theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Backdrop on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{activeSession?.title ?? "Chat"}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={regenerate}
            disabled={busy || messages.length === 0}
            aria-label="Regenerate"
            title="Regenerate response"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={messages.length === 0} aria-label="Export">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  exportAsPdf(activeSession?.title ?? "Chat", messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })))
                }
              >
                <FileDown className="mr-2 h-4 w-4" /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportAsText(activeSession?.title ?? "Chat", messages.map((m) => ({ role: m.role, content: m.content, created_at: m.created_at })))
                }
              >
                <FileText className="mr-2 h-4 w-4" /> Export as Text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-semibold">How can I help you today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick a prompt or type your own.</p>
                <div className="mt-6 w-full">
                  <SuggestedPrompts />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    m={m}
                    streaming={busy && m === messages[messages.length - 1] && m.role === "assistant"}
                    fontSize={settings.fontSize}
                    showTimestamp={settings.showTimestamps}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card/70 p-2 shadow-card focus-within:border-primary/60">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Message Querry Mittra…"
                rows={1}
                maxLength={4000}
                className="max-h-40 min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0"
              />
              {busy ? (
                <Button
                  onClick={stop}
                  size="icon"
                  variant="destructive"
                  className="h-10 w-10 shrink-0"
                  aria-label="Stop"
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={send}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-10 w-10 shrink-0 bg-brand-gradient text-primary-foreground hover:opacity-90"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              {settings.enterToSend ? "Enter to send · Shift+Enter for newline" : "Shift+Enter to send"} · Querry Mittra can make mistakes.
            </p>
          </div>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            maxLength={80}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRename} className="bg-brand-gradient text-primary-foreground hover:opacity-90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.title}" and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onClearChats={clearAllChats}
      />
    </div>
  );
}

const fontSizeClass: Record<string, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

function MessageBubble({
  m,
  streaming,
  fontSize,
  showTimestamp,
}: {
  m: ChatMessage;
  streaming?: boolean;
  fontSize: "sm" | "md" | "lg";
  showTimestamp: boolean;
}) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`break-words rounded-2xl px-4 py-2.5 leading-relaxed shadow-card ${fontSizeClass[fontSize]} ${
            isUser
              ? "bg-brand-gradient text-primary-foreground"
              : "bg-card text-card-foreground border border-border"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{m.content}</div>
          ) : m.content ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-2 prose-pre:bg-muted prose-pre:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-headings:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          ) : streaming ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </span>
          ) : null}
          {streaming && m.content && (
            <span className="ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 bg-current animate-blink" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 px-1">
          {showTimestamp && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {!isUser && m.content && (
            <button
              onClick={copy}
              className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              aria-label="Copy"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
