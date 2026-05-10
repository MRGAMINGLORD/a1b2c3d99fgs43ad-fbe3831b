import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Bob the Turtle AI is a self-contained Gemini-canvas-style React snippet
 * that lives in `public/games/bob-turtle-ai/index.html`. We render it inside
 * a sandboxed iframe so its Firebase / Gemini globals can't collide with the
 * host app. We mount the iframe immediately (no pre-flight fetch) so loading
 * starts as soon as possible.
 */
const BobTurtleAI = () => {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const src = useMemo(() => "/games/bob-turtle-ai/index.html", []);

  return (
    <div className="fixed inset-0 bg-background p-2 sm:p-3">
      <Link
        to="/"
        className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to hub
      </Link>
      <div className="relative h-full w-full overflow-hidden rounded-md border border-primary/50 bg-card border-glow">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <p className="font-display text-sm uppercase tracking-wider text-primary">
              Waking Bob...
            </p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={src}
          title="Bob the Turtle AI"
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0 bg-background"
          allow="fullscreen; clipboard-write"
        />
      </div>
    </div>
  );
};

export default BobTurtleAI;
