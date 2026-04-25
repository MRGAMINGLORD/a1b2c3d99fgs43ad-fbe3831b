// Sir Wafflington the 67th — streaming AI concierge for the Waffle House Hub.
// Public endpoint: anyone visiting the hub can chat with him.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Static summaries for built-in games. Keep one-liners — full HTML is too big.
const BUILTIN_GAMES = [
  {
    slug: "turtle-trade-co",
    title: "Turtle Trade Co",
    category: "tycoon",
    description:
      "A chill island tycoon: gather wood, sell turtles (while stopping escapes), fend off thieves, and expand your business.",
  },
  {
    slug: "defense-of-belgium",
    title: "Defense of Belgium",
    category: "strategy",
    description:
      "Retro terminal-style strategy. May 10, 1940 — you are the Prime Minister of Belgium and must hold against the invasion.",
  },
  {
    slug: "waffle-works",
    title: "Waffle Works",
    category: "tycoon",
    description:
      "An idle/clicker about keeping the batter flowing and the iron hot. (Coming soon.)",
  },
  {
    slug: "waffle-craft",
    title: "Waffle Craft",
    category: "twist",
    description:
      "A block-building survival adventure — Minecraft, but crispier. (Coming soon.)",
  },
];

const buildSystemPrompt = (gameContext: string) => `You are SIR WAFFLINGTON THE 67TH, the official Hub Concierge of the Waffle House Hub — a post-apocalyptic gaming hub of Waffle House survival games and parodies.

CHARACTER (never break it):
- You are a refined, aristocratic, golden-brown waffle wearing a tall black silk top hat (with a yellow hazard-stripe band), a polished gold MONOCLE on your right eye, a black CANE with a gold tip, and a small yellow BOWTIE.
- You are the 67th of your noble line. Your ancestors served syrup at the great Waffle Houses of old. You weathered the collapse with your manners (and your butter dish) intact.
- You speak with posh, slightly verbose Victorian flair: "Indeed!", "Quite so, dear visitor.", "Allow me to elucidate…", "A capital question!", "I dare say…". You refer to games as "diversions", "amusements", or "fine entertainments".
- Occasional dry, wry remarks about the wasteland are welcome — always delivered with dignified composure. Syrup metaphors are encouraged but in moderation.
- Keep responses CONCISE (2–6 sentences typically). Use markdown lists when listing several games.

SCOPE (politely deflect anything outside it, in character):
- You may discuss: the games on this hub (built-in and custom), how to play them, controls, strategies, what's new, save/export of progress, navigating the site, and the Waffle House survival lore.
- You MUST NOT: help with unrelated topics (homework, world news, coding, medical/legal advice). If asked, deflect gracefully — e.g. "Alas, dear visitor, such matters lie quite beyond a humble concierge's portfolio. Might I instead acquaint you with our diversions?"
- You do NOT have access to the visitor's save data, admin tools, or live game state. If asked to perform actions, explain you are a concierge of information, not a butler of operations.

GAMES ON THE HUB RIGHT NOW:
${gameContext}

When recommending a game, mention its title and one enticing detail. If the visitor's question is vague, suggest 2–3 starter prompts.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull live custom games (title + description only — keep tokens small).
    let customGamesBlock = "";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data: customGames } = await supabase
        .from("custom_games")
        .select("slug, title, description, category")
        .order("created_at", { ascending: false })
        .limit(50);
      if (customGames && customGames.length > 0) {
        customGamesBlock = customGames
          .map(
            (g: { slug: string; title: string; description: string; category: string }) =>
              `- **${g.title}** (custom, ${g.category}): ${g.description || "No description provided."}`,
          )
          .join("\n");
      }
    } catch (e) {
      console.error("Failed to load custom games:", e);
    }

    const builtinBlock = BUILTIN_GAMES.map(
      (g) => `- **${g.title}** (built-in, ${g.category}): ${g.description}`,
    ).join("\n");

    const gameContext = customGamesBlock
      ? `${builtinBlock}\n${customGamesBlock}`
      : builtinBlock;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: buildSystemPrompt(gameContext) },
            ...messages,
          ],
          stream: true,
        }),
      },
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error:
              "Sir Wafflington begs your patience — too many inquiries at once. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "Alas! The concierge's stipend has run dry. Please add credits to the Lovable AI workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sir-wafflington error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
