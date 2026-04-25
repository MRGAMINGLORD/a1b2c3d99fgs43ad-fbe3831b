import heroBg from "@/assets/hero-bg.png";
import FeedbackForm from "@/components/FeedbackForm";
import GameCard from "@/components/GameCard";
import WhatsNew from "@/components/WhatsNew";
import PatchNotes from "@/components/PatchNotes";
import SaveDataPanel from "@/components/SaveDataPanel";
import FeaturedGamesCarousel from "@/components/FeaturedGamesCarousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GAMES } from "@/lib/games";
import { useCustomGames } from "@/hooks/useCustomGames";

const Index = () => {
  const { games: customGames } = useCustomGames();
  const allGames = [...GAMES, ...customGames];
  const tycoonGames = allGames.filter((g) => g.category === "tycoon");
  const twistGames = allGames.filter((g) => g.category === "twist");
  const otherGames = allGames.filter((g) => g.category === "other");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt="Apocalyptic Waffle House scene"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative z-10 px-6 text-center">
          <h1 className="mb-2 font-display text-6xl tracking-tight text-primary text-glow sm:text-8xl">
            APOCALYPSE WAFFLE
          </h1>
          <p className="mx-auto max-w-xl text-lg text-primary sm:text-xl">
            Apocalypse Waffle is a gaming hub featuring waffle-themed twists on
            classic games and intense, original survival challenges. Instead of
            serving food, you play as a customer fighting to survive
            catastrophic natural disasters while trapped inside a Waffle House.
          </p>
          <div className="mt-4">
            <a
              href="/test"
              className="inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-background/40 px-2 py-1 font-display text-[10px] uppercase tracking-wider text-primary/70 hover:text-primary"
            >
              ⚙ Test Mode
            </a>
          </div>
        </div>
      </section>

      {/* What's New */}
      <WhatsNew />

      {/* Patch Notes */}
      <PatchNotes />

      {/* Save / Continue */}
      <SaveDataPanel />

      {/* Featured Games (admin-curated) */}
      <FeaturedGamesCarousel />

      {/* Games (collapsible sections) */}
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-10">
        <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
          Games
        </h2>

        <Accordion
          type="multiple"
          defaultValue={["tycoon", "twist", "other"]}
          className="space-y-3"
        >
          <AccordionItem
            value="tycoon"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Tycoon Games
                </div>
                <div className="text-xs italic text-muted-foreground">
                  tycoons that slowly grow with weird twists
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 pt-2 sm:grid-cols-2">
                {tycoonGames.map((g) => (
                  <GameCard
                    key={g.id}
                    title={g.title}
                    description={g.description}
                    cover={g.cover}
                    available={g.available}
                    playUrl={g.playUrl}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="twist"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Waffly Twists
                </div>
                <div className="text-xs italic text-muted-foreground">
                  special twists on popular games
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 pt-2 sm:grid-cols-2">
                {twistGames.map((g) => (
                  <GameCard
                    key={g.id}
                    title={g.title}
                    description={g.description}
                    cover={g.cover}
                    available={g.available}
                    playUrl={g.playUrl}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="other"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Other Games
                </div>
                <div className="text-xs italic text-muted-foreground">
                  some were built by us but most aren't
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-6 pt-2 sm:grid-cols-2">
                {otherGames.map((g) => (
                  <GameCard
                    key={g.id}
                    title={g.title}
                    description={g.description}
                    cover={g.cover}
                    available={g.available}
                    playUrl={g.playUrl}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Feedback */}
      <FeedbackForm />
    </div>
  );
};

export default Index;
