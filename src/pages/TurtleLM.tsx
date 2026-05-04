import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TurtleLM = () => {
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
            Turtle LM
          </h1>
        </div>
      </header>
      <main className="mx-auto grid max-w-2xl flex-1 place-items-center px-4 py-10 text-center">
        <div className="space-y-3">
          <div className="text-6xl">🐢</div>
          <h2 className="font-display text-2xl uppercase tracking-wider text-primary">
            Turtle LM
          </h2>
          <p className="text-sm text-muted-foreground">
            Turtle LM interface is currently under construction.
          </p>
        </div>
      </main>
    </div>
  );
};

export default TurtleLM;
