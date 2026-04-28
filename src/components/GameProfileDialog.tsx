// Read-only "game profile" viewer used in the admin panel. Given a key
// (`builtin:<id>` or `custom:<row-id>`) it renders the cover, title, slug,
// category, location (URL or storage path), description, credits and a
// quick "open in new tab" link. Lets admins audit games at a glance.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { GAMES, type GameMeta } from "@/lib/games";
import type { CustomGameRow } from "@/hooks/useCustomGames";

interface GameProfileDialogProps {
  gameKey: string | null;
  customGames: CustomGameRow[];
  onClose: () => void;
}

interface ResolvedProfile {
  title: string;
  slug: string;
  description: string;
  cover: string | null;
  category: string;
  credits: string;
  location: string;
  playUrl: string;
  available: boolean;
  source: "Built-in" | "Custom";
}

const resolve = (
  gameKey: string,
  customGames: CustomGameRow[],
): ResolvedProfile | null => {
  if (gameKey.startsWith("builtin:")) {
    const id = gameKey.slice("builtin:".length);
    const g: GameMeta | undefined = GAMES.find((x) => x.id === id);
    if (!g) return null;
    return {
      title: g.title,
      slug: g.id,
      description: g.description,
      cover: g.cover,
      category: g.category,
      credits: g.credits ?? "",
      location: g.playUrl ? `Static file at /games/${g.id}/index.html` : "Not yet published",
      playUrl: g.playUrl ?? "",
      available: g.available,
      source: "Built-in",
    };
  }
  if (gameKey.startsWith("custom:")) {
    const id = gameKey.slice("custom:".length);
    const r = customGames.find((x) => x.id === id);
    if (!r) return null;
    const isUrl = /^https?:\/\//i.test(r.html.trim());
    return {
      title: r.title,
      slug: r.slug,
      description: r.description || "—",
      cover: r.cover_url,
      category: r.category,
      credits: r.credits ?? "",
      location: !r.html.trim()
        ? "No code uploaded yet"
        : isUrl
          ? r.html
          : "Inline HTML (legacy row)",
      playUrl: `/play/${r.slug}`,
      available: r.html.trim().length > 0,
      source: "Custom",
    };
  }
  return null;
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-border/40 py-2 last:border-0">
    <div className="font-display text-[11px] uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="break-words text-sm text-foreground">{children}</div>
  </div>
);

const GameProfileDialog = ({ gameKey, customGames, onClose }: GameProfileDialogProps) => {
  const profile = gameKey ? resolve(gameKey, customGames) : null;
  const open = !!profile;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        {profile && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-primary">
                {profile.title}{" "}
                <span className="ml-2 rounded border border-primary/40 px-1.5 py-0.5 align-middle font-display text-[10px] uppercase tracking-wider text-primary">
                  {profile.source}
                </span>
              </DialogTitle>
            </DialogHeader>

            {profile.cover && (
              <img
                src={profile.cover}
                alt={`${profile.title} cover`}
                className="h-44 w-full rounded-md border border-primary/40 object-cover"
              />
            )}

            <div className="mt-2">
              <Row label="Slug"><span className="font-mono text-primary">{profile.slug}</span></Row>
              <Row label="Category">{profile.category}</Row>
              <Row label="Status">
                {profile.available ? (
                  <span className="text-primary">Playable</span>
                ) : (
                  <span className="text-muted-foreground">Not playable yet</span>
                )}
              </Row>
              <Row label="Play URL">
                {profile.playUrl ? (
                  <span className="font-mono text-primary">{profile.playUrl}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Row>
              <Row label="Location">
                <span className="font-mono text-xs text-foreground">{profile.location}</span>
              </Row>
              <Row label="Description">{profile.description}</Row>
              <Row label="Credits">
                {profile.credits ? (
                  <span className="whitespace-pre-wrap">{profile.credits}</span>
                ) : (
                  <span className="text-muted-foreground">No credits recorded.</span>
                )}
              </Row>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              {profile.playUrl && profile.available && (
                <Button asChild variant="outline" size="sm">
                  <a href={profile.playUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Open game
                  </a>
                </Button>
              )}
              <Button size="sm" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GameProfileDialog;
