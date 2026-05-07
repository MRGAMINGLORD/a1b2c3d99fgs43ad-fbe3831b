import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import FeaturedGamesAdmin from "@/components/FeaturedGamesAdmin";
import GameProfilesAdmin from "@/components/GameProfilesAdmin";
import CustomGamesAdmin from "@/components/CustomGamesAdmin";
import PatchNotesAdmin from "@/components/PatchNotesAdmin";
import DefconAdmin from "@/components/DefconAdmin";

interface Feedback {
  id: string;
  name: string;
  message: string;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const ALLOWED_ADMIN_EMAIL = "mrgaminglordfuzz@gmail.com";
      const CO_ADMIN_EMAIL = "67er@coadmin.local";

      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        toast({
          title: "Sign in required",
          description: "You must be signed in to access the admin dashboard.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const email = (user.email ?? "").toLowerCase();

      // Co-admin path — limited access (announcements + feedback only)
      if (email === CO_ADMIN_EMAIL) {
        setIsCoAdmin(true);
        setLoading(false);
        loadData();
        return;
      }

      // Full admin must have a confirmed email
      if (!user.email_confirmed_at && !(user as unknown as { confirmed_at?: string }).confirmed_at) {
        await supabase.auth.signOut();
        toast({
          title: "Email not confirmed",
          description: "Confirm the email link sent to your inbox, then sign in again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (email !== ALLOWED_ADMIN_EMAIL) {
        await supabase.auth.signOut();
        toast({
          title: "Account not authorized",
          description: `Only ${ALLOWED_ADMIN_EMAIL} can access the admin dashboard.`,
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data: hasRole, error: roleErr } = await supabase.rpc("is_admin" as never);
      if (roleErr) {
        toast({
          title: "Could not verify admin role",
          description: roleErr.message,
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      if (!hasRole) {
        await supabase.auth.signOut();
        toast({
          title: "Missing admin role",
          description: "Your account is signed in but doesn't have the admin role yet.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      loadData();
    };
    checkAdmin();
  }, [navigate]);

  const loadData = async () => {
    const [fb, ann] = await Promise.all([
      supabase.from("feedback").select("*").order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);
    if (fb.data) setFeedback(fb.data);
    if (ann.data) setAnnouncements(ann.data);
  };

  const addAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const { error } = await supabase.from("announcements").insert({ title: newTitle.trim(), content: newContent.trim() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setNewTitle("");
    setNewContent("");
    loadData();
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    loadData();
  };

  const deleteFeedback = async (id: string) => {
    await supabase.from("feedback").delete().eq("id", id);
    loadData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-primary">Loading...</div>;
  if (!isAdmin && !isCoAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-display text-3xl text-primary">
            {isCoAdmin ? "Co-Admin Dashboard (67'er)" : "Admin Dashboard"}
          </h1>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>

        {isAdmin && (
          <>
            <DefconAdmin />
            <FeaturedGamesAdmin />
            <GameProfilesAdmin />
            <CustomGamesAdmin />
          </>
        )}

        {/* Add Announcement */}
        <div className="mb-10 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-xl text-primary">New Announcement</h2>
          <form onSubmit={addAnnouncement} className="space-y-3">
            <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} required />
            <Textarea placeholder="Content" value={newContent} onChange={(e) => setNewContent(e.target.value)} maxLength={1000} required />
            <Button type="submit">Post Announcement</Button>
          </form>
        </div>

        {/* Announcements */}
        <div className="mb-10">
          <h2 className="mb-4 font-display text-xl text-primary">Announcements ({announcements.length})</h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <h3 className="font-display text-primary">{a.title}</h3>
                  <p className="text-sm text-muted-foreground">{a.content}</p>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteAnnouncement(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Patch Notes (admin-edited) */}
        {isAdmin && <PatchNotesAdmin />}

        {/* Feedback */}
        <div>
          <h2 className="mb-4 font-display text-xl text-primary">Feedback ({feedback.length})</h2>
          <div className="space-y-3">
            {feedback.length === 0 && <p className="text-muted-foreground">No feedback yet.</p>}
            {feedback.map((f) => (
              <div key={f.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
                <div>
                  <div className="mb-1 flex items-center gap-3">
                    <span className="font-semibold text-primary">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-card-foreground">{f.message}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteFeedback(f.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
