## Sir Wafflington the 67th — AI Game Guide

A monocle-wearing, top-hatted, cane-twirling waffle aristocrat who tells visitors all about the games on the hub. Speaks with refined Victorian flair, but still on-brand with the gritty post-apocalyptic Waffle House theme — a dignified gentleman who has weathered the collapse with his manners (and syrup) intact.

---

### 1. Character

**Name:** Sir Wafflington the 67th
**Title:** "Hub Concierge & Connoisseur of Fine Diversions"
**Voice:** Posh, verbose, fond of "Indeed!", "Quite so, dear visitor.", "Allow me to elucidate…". Refers to games as "diversions" or "amusements". Occasional dry remark about the wasteland between syrup metaphors.
**Scope:** Only answers questions about the hub's games (built-in + custom), how to play, what's new, save/export, and general site navigation. Politely deflects unrelated topics in-character.

---

### 2. Visual — the avatar

Custom inline SVG (no external assets) of a golden-brown waffle wearing:
- **Top hat** — tall black silk hat with a yellow hazard-stripe band
- **Monocle** — gold ring + chain on the right "eye" square of the waffle grid
- **Cane** — black with a gold tip, held at a jaunty angle
- **Bowtie** — small yellow bowtie under the waffle
- A subtle drip of syrup as a flourish

Used at three sizes:
- 48px — floating action button
- 64px — chat sheet header
- 32px — assistant message avatar

Built as `src/components/SirWafflingtonAvatar.tsx` so it scales crisply.

---

### 3. UI / placement

- **Floating button** (fixed bottom-right) on every route, mounted in `src/App.tsx`. Avatar + "Ask Sir Wafflington" hover label. Uses the existing `animate-pulse-glow` for a subtle shimmer.
- **Chat panel** opens in a right-side `Sheet` (already in the codebase).
- **Header:** large avatar + "Sir Wafflington the 67th" in `font-display` (Black Ops One) + tagline.
- **Messages:** user right-aligned plain bubbles; assistant left-aligned with the 32px avatar, rendered via `react-markdown`.
- **Input:** textarea + send button. Enter sends, Shift+Enter newline. Disabled while streaming.
- **Empty state:** Sir Wafflington introduces himself and offers 3 starter prompts ("What games are available?", "How do I save my progress?", "Tell me about Defense of Belgium").

New file: `src/components/SirWafflingtonChat.tsx`.

---

### 4. Backend — streaming edge function

New: `supabase/functions/sir-wafflington/index.ts`

- **Lovable AI Gateway** (`LOVABLE_API_KEY` already provisioned, no user setup) using **`google/gemini-3-flash-preview`** for fast, cheap streaming.
- SSE streamed line-by-line to the client following the standard pattern.
- **System prompt** establishes the character (top hat, monocle, cane, 67th of his line, refined-but-apocalyptic concierge of the hub) and locks scope to hub/games.
- **Game context** built server-side per request:
  - Static block summarising built-in games (`Defense of Belgium`, `Turtle Trade Co`, etc.) with one-line descriptions.
  - Live `select slug, title, description, category from custom_games` to inject every admin-added game's title + description (NOT the HTML — keeps tokens low).
- 429 (rate-limited) and 402 (credits exhausted) bubbled back with friendly toasts on the client.
- CORS + OPTIONS handler per the standard pattern.
- Public endpoint — anyone visiting the hub can chat with him. Lovable-managed default `verify_jwt = false` is fine; no `config.toml` change needed.

Request body: `{ messages: [{ role, content }, ...] }`. The client sends full conversation history each turn; chat is in-memory only (resets when the sheet closes), matching a "concierge dropping by" feel.

---

### 5. Dependency

Add `react-markdown` so assistant responses render formatted (lists, bold, code). No other new deps.

---

### 6. Files

**Created**
- `src/components/SirWafflingtonAvatar.tsx` — the SVG character
- `src/components/SirWafflingtonChat.tsx` — floating button + Sheet chat UI with streaming
- `supabase/functions/sir-wafflington/index.ts` — streaming AI edge function with character prompt + game context

**Modified**
- `src/App.tsx` — mount `<SirWafflingtonChat />` once at app root
- `package.json` — add `react-markdown`

**Memory**
- New `mem://features/sir-wafflington` capturing his character, look, and scope so future changes stay consistent.

---

### 7. Out of scope (intentionally)

- No persistent chat history across sessions.
- No access to save data, admin tools, or live game state — he's a concierge, not an operator.
- No voice / TTS.
