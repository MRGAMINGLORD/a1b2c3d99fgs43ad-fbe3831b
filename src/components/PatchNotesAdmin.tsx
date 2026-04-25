import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Trash2, Pencil, Plus } from "lucide-react";

interface PatchNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  created_at: string;
}

const PatchNotesAdmin = () => {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("patch_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading patch notes", description: error.message, variant: "destructive" });
      return;
    }
    setNotes(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditingId(null);
    setVersion("");
    setTitle("");
    setContent("");
  };

  const startEdit = (n: PatchNote) => {
    setEditingId(n.id);
    setVersion(n.version ?? "");
    setTitle(n.title);
    setContent(n.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      version: version.trim() || null,
      title: title.trim(),
      content: content.trim(),
    };
    const { error } = editingId
      ? await supabase.from("patch_notes").update(payload).eq("id", editingId)
      : await supabase.from("patch_notes").insert(payload);
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Patch note updated" : "Patch note posted" });
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this patch note?")) return;
    const { error } = await supabase.from("patch_notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (editingId === id) reset();
    load();
  };

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-xl text-primary">
        {editingId ? "Edit Patch Note" : "New Patch Note"}
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="pn-version">Version (optional, e.g. 1.2.0)</Label>
          <Input
            id="pn-version"
            placeholder="1.0.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            maxLength={30}
          />
        </div>
        <div>
          <Label htmlFor="pn-title">Title</Label>
          <Input
            id="pn-title"
            placeholder="What's in this update?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div>
          <Label htmlFor="pn-content">Content</Label>
          <Textarea
            id="pn-content"
            placeholder="- Added X\n- Fixed Y\n- Changed Z"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            maxLength={5000}
            required
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            <Plus className="mr-1 h-4 w-4" />
            {editingId ? "Save Changes" : "Post Patch Note"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={reset}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <div className="mt-8">
        <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-primary">
          Patch Notes ({notes.length})
        </h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No patch notes yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between rounded-md border border-primary/40 bg-background/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-sm text-primary">{n.title}</span>
                    {n.version && (
                      <span className="font-mono text-xs text-destructive">v{n.version}</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {n.content}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(n)}>
                    <Pencil className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatchNotesAdmin;
