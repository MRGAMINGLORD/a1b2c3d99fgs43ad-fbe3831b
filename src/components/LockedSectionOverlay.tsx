// Frosted overlay shown over the Games sections until they are unlocked.
// Intentionally vague — does NOT mention Sir Wafflington (that's the secret).
import { Lock } from "lucide-react";

export const LockedSectionOverlay = () => (
  <div
    aria-label="Section locked"
    className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/70 backdrop-blur-md"
  >
    <Lock className="h-10 w-10 text-primary" aria-hidden />
    <p className="font-display text-sm uppercase tracking-widest text-primary">
      Locked
    </p>
    <p className="max-w-[18rem] text-center text-xs text-muted-foreground">
      You don't have the keys to this section yet.
    </p>
  </div>
);
