// ─────────────────────────────────────────────────────────────
// BOB THE TURTLE AI — paste your component code here.
//
// The previous implementation was removed at your request. This
// file is mounted at /education/bob-turtle-ai. Replace the
// placeholder below with your own component. Keep the
// `export default` so the route keeps working.
//
// The matching edge function lives at
// `supabase/functions/bob-turtle/index.ts` — paste your backend
// code there.
// ─────────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BobTurtleAI = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-primary/40 bg-card/60 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back to hub">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-display text-lg uppercase tracking-wider text-primary sm:text-xl">
            Bob the Turtle AI
          </h1>
        </div>
      </header>
      <main className="mx-auto grid max-w-2xl flex-1 place-items-center px-4 py-10 text-center">
        <div className="space-y-3">
          <div className="text-6xl">🐢</div>
          <h2 className="font-display text-2xl uppercase tracking-wider text-primary">
            Bob is napping
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste your Bob the Turtle component code into{" "}
            <code className="rounded bg-muted px-1">src/pages/BobTurtleAI.tsx</code>{" "}
            and your backend into{" "}
            <code className="rounded bg-muted px-1">
              supabase/functions/bob-turtle/index.ts
            </code>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default BobTurtleAI;
