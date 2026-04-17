import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBrandSelector } from "@/hooks/useBrandSelector";
import {
  Bot, Send, Trash2, Sparkles, User, Plus, MessageSquare,
  ChevronLeft, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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

const STARTER_PROMPTS = [
  "What should I focus on this week to improve my brand score?",
  "Why is my website score low and what can I do about it?",
  "Analyze my competitor landscape and give me positioning advice",
  "Write me a LinkedIn post about my brand story",
  "How long until my brand is ready to run paid ads?",
  "What's the biggest gap between me and my top competitor?",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary to-blue-600 text-white"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        {message.content}
      </div>
    </div>
  );
}

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
        <Button onClick={onNew} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          [1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-2">
            No conversations yet. Start a new chat to begin.
          </p>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                activeId === conv.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium">{conv.title}</p>
                {conv.brandName && (
                  <p className={cn("text-[10px] truncate", activeId === conv.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {conv.brandName}
                  </p>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className={cn(
                      "opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity flex-shrink-0",
                      activeId === conv.id ? "hover:bg-primary-foreground/20" : "hover:bg-muted-foreground/20"
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
                      This will permanently delete "{conv.title}" and all its messages. This cannot be undone.
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

export default function AiBrandCoach() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { brands, hasMultipleBrands } = useBrandSelector();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations list
  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["ai-conversations"],
    queryFn: () => apiFetch<Conversation[]>("/ai/coach/conversations"),
    staleTime: 30_000,
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: msgsLoading } = useQuery<ChatMessage[]>({
    queryKey: ["ai-messages", activeConversationId],
    queryFn: () => apiFetch<ChatMessage[]>(`/ai/coach/conversations/${activeConversationId}/messages`),
    enabled: activeConversationId !== null,
    staleTime: 0,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first conversation on load
  useEffect(() => {
    if (conversations.length > 0 && activeConversationId === null) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const createConversationMutation = useMutation({
    mutationFn: (opts: { brandId?: number; brandName?: string }) =>
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
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/ai/coach/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
        const remaining = conversations.filter(c => c.id !== deletedId);
        if (remaining.length > 0) setActiveConversationId(remaining[0].id);
      }
      toast({ title: "Conversation deleted" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ convId, message }: { convId: number; message: string }) =>
      apiFetch<{ message: ChatMessage }>(`/ai/coach/conversations/${convId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async ({ message }) => {
      await queryClient.cancelQueries({ queryKey: ["ai-messages", activeConversationId] });
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-messages", activeConversationId]) ?? [];
      const optimistic: ChatMessage = { id: Date.now(), role: "user", content: message, createdAt: new Date().toISOString() };
      queryClient.setQueryData(["ai-messages", activeConversationId], [...prev, optimistic]);
      return { prev };
    },
    onSuccess: (data) => {
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-messages", activeConversationId]) ?? [];
      queryClient.setQueryData(["ai-messages", activeConversationId], [...prev, data.message]);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["ai-messages", activeConversationId], ctx.prev);
      toast({ variant: "destructive", title: "Failed to send", description: String(err) });
    },
  });

  const handleNewChat = () => {
    const brand = brands.find(b => b.id === parseInt(selectedBrandId));
    createConversationMutation.mutate({
      brandId: brand?.id,
      brandName: brand?.brandName,
    });
  };

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");

    if (activeConversationId === null) {
      // Create conversation then send
      const brand = brands.find(b => b.id === parseInt(selectedBrandId));
      apiFetch<Conversation>("/ai/coach/conversations", {
        method: "POST",
        body: JSON.stringify({ brandId: brand?.id ?? null, brandName: brand?.brandName ?? null, title: "New Conversation" }),
      }).then(conv => {
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        setActiveConversationId(conv.id);
        sendMutation.mutate({ convId: conv.id, message: msg });
      });
    } else {
      sendMutation.mutate({ convId: activeConversationId, message: msg });
    }
  };

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
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">

        {/* Sidebar */}
        <div className={cn(
          "flex-shrink-0 border-r bg-card transition-all duration-200 flex flex-col",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}>
          <div className="p-3 border-b flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">AI Brand Coach</p>
              <p className="text-[10px] text-muted-foreground">Marcus, 30yr strategist</p>
            </div>
          </div>

          {/* Brand selector for new chats */}
          {hasMultipleBrands && (
            <div className="px-3 py-2 border-b">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Consulting for</p>
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" />
                        {b.brandName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ConversationSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onNew={handleNewChat}
            onDelete={(id) => deleteConversationMutation.mutate(id)}
            isLoading={convsLoading}
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-card flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {activeConversation?.title ?? "AI Brand Coach"}
              </p>
              {activeConversation?.brandName && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {activeConversation.brandName}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] gap-1 flex-shrink-0">
              <Sparkles className="h-3 w-3 text-primary" />
              GPT-4o
            </Badge>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {msgsLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-3/4" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-1">Hi, I'm Marcus</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-2">
                  Your AI brand strategist with 30 years of experience. I've already reviewed your brand data, scores, and competitors. What would you like to work on?
                </p>
                {hasMultipleBrands && !activeConversation?.brandName && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    Select a brand from the sidebar to get brand-specific advice
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-4">
                  {STARTER_PROMPTS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setInput(p); textareaRef.current?.focus(); }}
                      className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(m => <MessageBubble key={m.id} message={m} />)}
                {isThinking && (
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <Separator />

          {/* Input */}
          <div className="p-4 flex-shrink-0 bg-card">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Marcus anything about your brand... (Enter to send)"
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                size="icon"
                className="h-11 w-11 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter to send • Shift+Enter for new line • Marcus remembers your full conversation history
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
