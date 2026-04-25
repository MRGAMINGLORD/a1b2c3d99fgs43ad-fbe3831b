import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Trash2, Eraser } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
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

interface ChatRow {
  id: string;
  username: string;
  message: string;
  created_at: string;
}

const messageSchema = z.object({
  username: z
    .string()
    .trim()
    .nonempty({ message: "Pick a username first." })
    .max(40, { message: "Username max 40 chars." }),
  message: z
    .string()
    .trim()
    .nonempty({ message: "Message can't be empty." })
    .max(500, { message: "Message max 500 chars." }),
});

const USERNAME_KEY = "apocalypse-waffle:tester-username";

const TesterChat = ({ defaultUsername = "" }: { defaultUsername?: string }) => {
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(() => {
    try {
      return localStorage.getItem(USERNAME_KEY) ?? defaultUsername;
    } catch {
      return defaultUsername;
    }
  });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist username locally so testers don't have to re-enter every visit.
  useEffect(() => {
    try {
      if (username.trim()) localStorage.setItem(USERNAME_KEY, username.trim());
    } catch {}
  }, [username]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("tester_chat")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      setRows((data as ChatRow[]) ?? []);
      setLoading(false);
    })();

    // Check admin status (controls delete buttons)
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (active) setIsAdmin(Boolean(roleRow));
    })();

    // Realtime subscription
    const channel = supabase
      .channel("tester-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tester_chat" },
        (payload) => {
          setRows((prev) => [...prev, payload.new as ChatRow]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tester_chat" },
        (payload) => {
          setRows((prev) => prev.filter((r) => r.id !== (payload.old as ChatRow).id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rows.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = messageSchema.safeParse({ username, message });
    if (!parsed.success) {
      toast({
        title: "Invalid input",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("tester_chat").insert({
      username: parsed.data.username,
      message: parsed.data.message,
    });
    setSending(false);
    if (error) {
      toast({ title: "Send failed", description: error.message, variant: "destructive" });
      return;
    }
    setMessage("");
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from("tester_chat").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-5xl px-6 pb-12">
      <div className="rounded-lg border border-primary/40 bg-card/40 p-4 border-glow">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl uppercase tracking-wider text-primary">
            Tester Chat
          </h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Talk with other testers in real time. Be nice — admins can wipe spam.
        </p>

        <div
          ref={scrollRef}
          className="mb-3 h-64 space-y-2 overflow-y-auto rounded-md border border-border bg-background/40 p-3"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading messages…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet — say hi!</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="group flex items-start justify-between gap-2 rounded border border-primary/20 bg-card/60 p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-xs uppercase tracking-wider text-primary">
                      {r.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="break-words text-foreground">{r.message}</p>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => removeRow(r.id)}
                    aria-label="Delete message"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={send} className="space-y-2">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={40}
            aria-label="Tester username"
          />
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              className="flex-1"
            />
            <Button type="submit" disabled={sending} className="self-end">
              <Send className="mr-1 h-4 w-4" />
              Send
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {message.length}/500 — messages are public to anyone with the test password.
          </p>
        </form>
      </div>
    </section>
  );
};

export default TesterChat;
