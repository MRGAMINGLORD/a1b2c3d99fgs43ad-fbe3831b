// Central registry of all games on the hub.
// New games should be added here so Admin can feature them.

import coverTurtleTradeCo from "@/assets/cover-turtle-trade-co.jpg";
import coverWaffleWorks from "@/assets/cover-waffle-works.jpg";
import coverWaffleCraft from "@/assets/cover-waffle-craft.jpg";
import coverDefenseOfBelgium from "@/assets/cover-defense-of-belgium.jpg";
import coverBobTurtleAI from "@/assets/cover-bob-turtle-ai.jpg";
import coverTurtleLM from "@/assets/cover-turtle-lm.jpg";

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  cover: string;
  available: boolean;
  playUrl?: string;
  category: "tycoon" | "twist" | "other" | "education";
  /** Free-form credits string — author, art, music, etc. Displayed on the
   * admin "game profile" view. Empty for games without recorded credits. */
  credits?: string;
}

export const GAMES: GameMeta[] = [
  {
    id: "turtle-trade-co",
    title: "Turtle Trade Co",
    description:
      "A chill island tycoon where you gather wood, sell turtles (while stopping escapes), fend off thieves, and expand your business.",
    cover: coverTurtleTradeCo,
    available: true,
    playUrl: "/play/turtle-trade-co",
    category: "tycoon",
    credits: "Design & code: Apocalypse Waffle team",
  },
  {
    id: "waffle-works",
    title: "Waffle Works",
    description:
      "A cookie clicker-style idle game. Keep the batter flowing and the iron hot!",
    cover: coverWaffleWorks,
    available: false,
    category: "tycoon",
    credits: "",
  },
  {
    id: "turtle-lm",
    title: "Turtle LM",
    description:
      "A turtle-flavored language model playground for learning. Slow, steady, and surprisingly clever.",
    cover: coverTurtleLM,
    available: false,
    category: "education",
    credits: "Design: Apocalypse Waffle team",
  },
  {
    id: "waffle-craft",
    title: "Waffle Craft",
    description:
      "A block-building survival adventure — Minecraft, but crispier and better.",
    cover: coverWaffleCraft,
    available: false,
    category: "twist",
    credits: "",
  },
  {
    id: "defense-of-belgium",
    title: "Defense of Belgium",
    description:
      "A retro terminal-style strategy game. May 10, 1940 — you are the Prime Minister of Belgium.",
    cover: coverDefenseOfBelgium,
    available: true,
    playUrl: "/play/defense-of-belgium",
    category: "other",
    credits: "Design & code: Apocalypse Waffle team",
  },
  {
    id: "bob-turtle-ai",
    title: "Bob the Turtle AI",
    description:
      "A patient turtle tutor powered by Gemini. Ask Bob about any subject — math, science, history, languages, code — and he'll explain it slow, steady, and shell-sized.",
    cover: coverBobTurtleAI,
    available: true,
    playUrl: "/education/bob-turtle-ai",
    category: "education",
    credits: "Powered by Google Gemini · Tutor persona by Apocalypse Waffle",
  },
];

export const getGame = (id: string): GameMeta | undefined =>
  GAMES.find((g) => g.id === id);
