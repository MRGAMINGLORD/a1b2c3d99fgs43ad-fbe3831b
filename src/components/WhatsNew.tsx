import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const WhatsNew = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setAnnouncements(data);
      });
  }, []);

  if (announcements.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-8 pt-10">
      <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
        <Sparkles className="mx-auto mb-2 h-8 w-8" />
        What's New
      </h2>
      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-1 font-display text-lg text-primary">{a.title}</h3>
            <p className="text-sm text-muted-foreground">{a.content}</p>
            <span className="mt-2 block text-xs text-muted-foreground">
              {new Date(a.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhatsNew;
