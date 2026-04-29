## Problem 1 — Neon Snake shows raw code instead of running

The file at `/storage/.../game-files/neon-snake/index.html` is being served with `Content-Type: text/plain` and `X-Content-Type-Options: nosniff`. With nosniff, the browser refuses to render it as HTML inside the iframe and shows the source instead.

Two reasons this happens:
1. The bucket-level default content type is `text/plain`. The `contentType` option on `supabase.storage.upload()` only takes effect on the **first** insert at that path; subsequent `upsert: true` writes don't always update it. Neon Snake's file was uploaded before we fixed the header.
2. Even when set per upload, the canonical fix is to delete + re-insert (or pass an explicit `contentType` plus a Blob whose own MIME type matches).

### Fix
- Update `uploadGameFile` in `CustomGamesAdmin.tsx` to first `remove()` the existing object, then `upload()` fresh with `contentType: "text/html; charset=utf-8"`. This guarantees the served `Content-Type` header is correct.
- One-time repair: when the admin re-saves Neon Snake (or any old game), the new code path will replace the file with the right header. No manual SQL needed.

## Problem 2 — Make new custom games live in the repo (visible in GitHub)

Right now, custom games are uploaded to a Supabase Storage bucket. They work, but they're invisible in your GitHub repo. You want each new custom game to land at `public/games/<slug>/index.html`, the same shape as Turtle Trade Co and Defense of Belgium.

### Constraint
The browser/Lovable runtime cannot write files into the project repo at runtime — that only happens during edit time. So the admin form can't literally `git push` a file. The realistic flow:

1. Admin pastes code and clicks **Post Game** → file is uploaded to Storage as today (so the game is immediately playable at `/play/<slug>`).
2. A new **"Export to repo"** button on each custom game opens a dialog with:
   - The full final HTML (post-React-wrap) in a code block with a copy button.
   - The exact target path: `public/games/<slug>/index.html`.
   - A short instruction: "Paste this into Lovable chat: 'Create file public/games/<slug>/index.html with the contents above.' Lovable will commit it to GitHub via the auto-sync."
3. Once the file exists in `/public/games/<slug>/`, `PlayGame.tsx` should prefer that local path over the Storage URL (so once exported, the game is served from your repo and shows in GitHub).

### Routing change in `PlayGame.tsx`
Add a small probe: when resolving a custom game, first try `HEAD /games/<slug>/index.html`. If it returns 200, use that as the iframe `src`. Otherwise fall back to the stored URL/blob. This means:
- Newly-posted games: served from Storage, playable instantly.
- Exported games: served from the repo, visible in GitHub, no DB dependency for the file itself.

## Files to change

- **`src/components/CustomGamesAdmin.tsx`**
  - Harden `uploadGameFile`: `remove()` then `upload()` with explicit `contentType`.
  - Add an **Export to repo** button (icon: `FileDown`) on each custom game row that opens a new `ExportToRepoDialog`.
- **`src/components/ExportToRepoDialog.tsx`** (new)
  - Fetches the stored HTML (or uses inline), shows target path + copy-to-clipboard, plus a one-line instruction the admin can paste back into Lovable chat to create the file.
- **`src/pages/PlayGame.tsx`**
  - For custom games, probe `/games/<slug>/index.html` via `fetch(..., { method: "HEAD" })` and prefer it when present.

## Out of scope (for now)
- Auto-committing files from the admin UI to GitHub — not possible from the running app. The export dialog is the bridge.
- Deleting the Storage copy after export — leave it as a fallback so nothing breaks if the repo file is removed.

## Notes for the user
After this change, to publish Neon Snake to GitHub:
1. Open the admin panel → Neon Snake → click **Export to repo**.
2. Copy the shown HTML, then tell Lovable in chat: *"Create `public/games/neon-snake/index.html` with this content: …"*.
3. Lovable commits it; GitHub sync picks it up automatically.
