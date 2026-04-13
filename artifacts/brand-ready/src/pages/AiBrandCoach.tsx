import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, Trash2, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const STARTER_PROMPTS = [
  "What should I focus on this week to improve my brand score?",
  "Write me a LinkedIn post about my brand story",
  "Why is my website score low and what can I do about it?",
  "Analyze my competitor landscape and give me positioning advice",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
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

export default function AiBrandCoach() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: history = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["ai-coach-history"],
    queryFn: () => apiFetch<ChatMessage[]>("/ai/coach/history"),
    staleTime: 0,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      apiFetch<{ message: ChatMessage }>("/ai/coach/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: ["ai-coach-history"] });
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-coach-history"]) ?? [];
      const optimistic: ChatMessage = { id: Date.now(), role: "user", content: message, createdAt: new Date().toISOString() };
      queryClient.setQueryData(["ai-coach-history"], [...prev, optimistic]);
      return { prev };
    },
    onSuccess: (data) => {
      const prev = queryClient.getQueryData<ChatMessage[]>(["ai-coach-history"]) ?? [];
      queryClient.setQueryData(["ai-coach-history"], [...prev, data.message]);
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["ai-coach-history"], ctx.prev);
      toast({ variant: "destructive", title: "Failed to send", description: String(err) });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiFetch("/ai/coach/history", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.setQueryData(["ai-coach-history"], []);
      toast({ title: "Conversation cleared" });
    },
  });

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Brand Coach
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your personal brand strategist — knows your scores, roadmap, and competitors
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate()} disabled={clearMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear chat
            </Button>
          )}
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="flex-1 overflow-y-auto p-4 min-h-0">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-3/4" />)}
              </div>
            ) : history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Meet your AI Brand Coach</h3>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">
                  Ask me anything about your brand. I know your scores, roadmap, and competitors — all personalized to you.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
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
                {history.map(m => <MessageBubble key={m.id} message={m} />)}
                {sendMutation.isPending && (
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </CardContent>
          <Separator />
          <div className="p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your brand coach anything... (Enter to send, Shift+Enter for new line)"
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button onClick={handleSend} disabled={!input.trim() || sendMutation.isPending} size="icon" className="h-11 w-11 flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
