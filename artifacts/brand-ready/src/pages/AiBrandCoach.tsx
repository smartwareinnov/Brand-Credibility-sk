import { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBrandSelector, type UserBrand } from "@/hooks/useBrandSelector";
import {
  Send, Trash2, Plus, MessageSquare, ChevronLeft,
  Briefcase, Sparkles, User, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  brandName: string | null;
  brandId: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Starter prompts ────────────────────────────────────────────────────────── */
const STARTER_PROMPTS = [
  "What should I focus on this week to improve my brand score?",
  "Why is my score low and what's the fastest way to fix it?",
  "Analyze my competitors and tell me where I'm losing",
  "How long until my brand is ready to run paid ads?",
  "Write me a LinkedIn post about my brand story",
  "What's my biggest competitive gap right now?",
];

/* ── Rita avatar ────────────────────────────────────────────────────────────── */
function RitaAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  return (
    <div className={cn(
      dim,
      "rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white shadow-sm",
      "bg-gradient-to-br from-violet-600 to-blue-600"
    )}>
      <span className={size === "sm" ? "text-[10px]" : "text-xs"}>R</span>
    </div>
  );
}

/* ── Message bubble ─────────────────────────────────────────────────────────── */
function MessageBubble({ message, animate }: { message: ChatMessage; animate?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={cn(
      "flex gap-3 mb-5",
      isUser ? "flex-row-reverse" : "flex-row",
      animate && "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    )}>
      {isUser ? (
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <RitaAvatar />
      )}
      <div className={cn(
        "max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border shadow-sm text-foreground rounded-tl-sm"
      )}>
        {/* Render line breaks and basic markdown-style bold */}
        {message.content.split("\n").map((line, i) => {
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* ── Typing indicator ───────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-5 animate-in fade-in-0 duration-200">
      <RitaAvatar />
      <div className="bg-card border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3.5">
        <div className="flex gap-1.5 items-center">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-2 h-2 bg-violet-500/60 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Brand selection modal ──────────────────────────────────────────────────── */
function BrandSelectModal({
  open,
  brands,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  brands: UserBrand[];
  onConfirm: (brand: UserBrand) => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = useState<string>(brands[0]?.id.toString() ?? "");

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <RitaAvatar size="md" />
            <div>
              <DialogTitle>Hi, I'm Rita</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Your senior brand strategist
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          You have multiple brands. Which one would you like to consult about today?
        </p>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map(b => (
              <SelectItem key={b.id} value={b.id.toString()}>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{b.brandName}</span>
                  {b.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">Default</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 pt-1">
          <Button
            className="flex-1"
            onClick={() => {
              const brand = brands.find(b => b.id.toString() === selected);
              if (brand) onConfirm(brand);
            }}
            disabled={!selected}
          >
            Start Consulting
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Conversation sidebar ───────────────────────────────────────────────────── */
function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading,
}: {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex-shrink-0">
        <Button onClick={onNew} className="w-full gap-2" size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5" /> New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-3 leading-relaxed">
            No conversations yet. Click "New Chat" to start.
          </p>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm",
                activeId === conv.id
                  ? "bg-violet-600 text-white"
                  : "hover:bg-muted text-foreground"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium leading-tight">{conv.title}</p>
                {conv.brandName && (
                  <p className={cn(
                    "text-[10px] truncate mt-0.5",
                    activeId === conv.id ? "text-white/60" : "text-muted-foreground"
                  )}>
                    {conv.brandName}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className={cn(
                      "opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity flex-shrink-0",
                      activeId === conv.id
                        ? "hover:bg-white/20 text-white"
                        : "hover:bg-muted-foreground/20 text-muted-foreground"
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{conv.title}" and all its messages will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(conv.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function AiBrandCoach() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { brands, hasMultipleBrands, isLoading: brandsLoading } = useBrandSelector();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [pendingBrand, setPendingBrand] = useState<UserBrand | null>(null);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [newChatPending, setNewChatPending] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [latestMessageId, setLatestMessageId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Queries ── */
  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["ai-conversations"],
    queryFn: () => apiFetch<Conversation[]>("/ai/coach/conversations"),
    staleTime: 30_000,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<ChatMessage[]>({
    queryKey: ["ai-messages", activeConversationId],
    queryFn: () => apiFetch<ChatMessage[]>(`/ai/coach/conversations/${activeConversationId}/messages`),
    enabled: activeConversationId !== null,
    staleTime: 0,
  });

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Auto-select first conversation ── */
  useEffect(() => {
    if (conversations.length > 0 && activeConversationId === null) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  /* ── Create conversation ── */
  const createConversationMutation = useMutation({
    mutationFn: (opts: { brandId?: number | null; brandName?: string | null }) =>
      apiFetch<Conversation>("/ai/coach/conversations", {
        method: "POST",
        body: JSON.stringify({
          brandId: opts.brandId ?? null,
          brandName: opts.brandName ?? null,
          title: "New Conversation",
        }),
      }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      setActiveConversationId(conv.id);
      setInput("");
      setNewChatPending(false);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to create conversation" });
      setNewChatPending(false);
    },
  });

  /* ── Delete conversation ── */
  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/ai/coach/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (activeConversationId === deletedId) {
        const remaining = conversations.filter(c => c.id !== deletedId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast({ title: "Conversation deleted" });
    },
  });

  /* ── Send message ── */
  const sendMutation = useMutation({
    mutationFn: ({ convId, message }: { convId: number; message: string }) =>
      apiFetch<{ message: ChatMessage }>(`/ai/coach/conversations/${convId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async ({ message }) => {
      await queryClient.cancelQueries({ queryKey: ["ai-messages", activeConversationId] });
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-messages", activeConversationId]) ?? [];
      const optimistic: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(["ai-messages", activeConversationId], [...prev, optimistic]);
      return { prev };
    },
    onSuccess: (data) => {
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-messages", activeConversationId]) ?? [];
      queryClient.setQueryData(["ai-messages", activeConversationId], [...prev, data.message]);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      setLatestMessageId(data.message.id);
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["ai-messages", activeConversationId], ctx.prev);
      toast({ variant: "destructive", title: "Rita couldn't respond", description: String(err) });
    },
  });

  /* ── Handle new chat button ── */
  const handleNewChat = useCallback(() => {
    if (hasMultipleBrands && !brandsLoading) {
      setShowBrandModal(true);
      setNewChatPending(true);
    } else {
      createConversationMutation.mutate({ brandId: null, brandName: null });
    }
  }, [hasMultipleBrands, brandsLoading, createConversationMutation]);

  /* ── Brand modal confirm ── */
  const handleBrandConfirm = (brand: UserBrand) => {
    setShowBrandModal(false);
    setPendingBrand(brand);
    createConversationMutation.mutate({ brandId: brand.id, brandName: brand.brandName });
  };

  const handleBrandSkip = () => {
    setShowBrandModal(false);
    createConversationMutation.mutate({ brandId: null, brandName: null });
  };

  /* ── Send message handler ── */
  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");

    if (activeConversationId === null) {
      // No active conversation — create one first, then send
      const brand = pendingBrand;
      apiFetch<Conversation>("/ai/coach/conversations", {
        method: "POST",
        body: JSON.stringify({
          brandId: brand?.id ?? null,
          brandName: brand?.brandName ?? null,
          title: "New Conversation",
        }),
      }).then(conv => {
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        setActiveConversationId(conv.id);
        sendMutation.mutate({ convId: conv.id, message: msg });
      }).catch(() => {
        toast({ variant: "destructive", title: "Failed to start conversation" });
      });
    } else {
      sendMutation.mutate({ convId: activeConversationId, message: msg });
    }
  }, [input, sendMutation, activeConversationId, pendingBrand, apiFetch, queryClient, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const isThinking = sendMutation.isPending;

  return (
    <DashboardLayout>
      {/* Brand selection modal */}
      {showBrandModal && (
        <BrandSelectModal
          open={showBrandModal}
          brands={brands}
          onConfirm={handleBrandConfirm}
          onSkip={handleBrandSkip}
        />
      )}

      <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-background">

        {/* ── Sidebar ── */}
        <div className={cn(
          "flex-shrink-0 border-r bg-card transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-60" : "w-0 overflow-hidden"
        )}>
          {/* Sidebar header */}
          <div className="p-3 border-b flex items-center gap-2.5 flex-shrink-0">
            <RitaAvatar size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Rita</p>
              <p className="text-[10px] text-muted-foreground leading-tight">AI Brand Strategist</p>
            </div>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 flex-shrink-0">AI</Badge>
          </div>

          <ConversationSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onNew={handleNewChat}
            onDelete={id => deleteConversationMutation.mutate(id)}
            isLoading={convsLoading}
          />
        </div>

        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", !sidebarOpen && "rotate-180")} />
            </button>

            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <RitaAvatar size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">
                  {activeConversation?.title ?? "Rita — Brand Strategist"}
                </p>
                {activeConversation?.brandName ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 leading-tight">
                    <Briefcase className="h-3 w-3" />
                    {activeConversation.brandName}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-tight">Your personal brand strategist</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground hidden sm:block">Online</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            {msgsLoading ? (
              <div className="space-y-5 max-w-2xl mx-auto">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                    <Skeleton className="h-16 flex-1 rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              /* Empty state */
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-5 shadow-lg">
                  <span className="text-3xl font-bold text-white">R</span>
                </div>
                <h2 className="font-bold text-xl mb-2">Hi, I'm Rita</h2>
                <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-1">
                  Your personal brand strategist. I've already reviewed your brand data, scores, and competitive landscape.
                </p>
                <p className="text-muted-foreground text-sm max-w-sm leading-relaxed mb-6">
                  What would you like to work on today?
                </p>

                {hasMultipleBrands && !activeConversation?.brandName && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 max-w-sm text-left">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>You have multiple brands. Use "New Chat" to select which brand you want to consult about.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {STARTER_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                      className="text-left text-xs px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground leading-relaxed"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {messages.map(m => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    animate={m.id === latestMessageId}
                  />
                ))}
                {isThinking && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <Separator />

          {/* Input area */}
          <div className="p-4 flex-shrink-0 bg-card">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 items-end">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Rita anything about your brand strategy..."
                  className="resize-none min-h-[48px] max-h-36 text-sm"
                  rows={1}
                  disabled={isThinking}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isThinking}
                  size="icon"
                  className="h-12 w-12 flex-shrink-0 bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Enter to send • Shift+Enter for new line • Rita remembers your full conversation
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
