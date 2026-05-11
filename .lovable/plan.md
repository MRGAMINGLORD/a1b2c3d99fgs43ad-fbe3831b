## Your three questions

### 1. Will talking to Bob charge Lovable AI credits?
**No.** Bob the Turtle AI calls Google's Gemini API directly from the browser using the API key entered in the iframe (or the fallback `AIzaSy...` key). It does **not** route through Lovable AI Gateway, so it doesn't consume your Lovable AI balance. It does count against Google's free Gemini quota for that key.

### 2. Why creating a custom game closes the tab
The whole site is wrapped in `FullscreenGate` (`src/App.tsx`). That component:
- Auto-enters fullscreen on first click.
- Listens for `fullscreenchange` and **kills the tab** (replaces page with `about:blank` and shows "Bunker sealed") the moment fullscreen exits.

When `CustomGamesAdmin.handleSubmit` calls the native `confirm("Post ... ?")` dialog, Chrome/Edge briefly drop fullscreen to show the modal — `FullscreenGate` sees this as "user exited fullscreen" and nukes the tab. Same thing will happen for any future `confirm()`/`alert()`/`prompt()` or file picker.

### 3. Turtle LM editing
`src/pages/TurtleLM.tsx` is currently just a placeholder ("under construction") — there is **no source/editor in it at all**. That's why the "edit code" flow isn't reachable, regardless of password. Bob the Turtle AI also has no in-page editor on its hub route — both only become editable through the Test page's Education accordion (which loads `test_custom_games` rows, not the hardcoded hub pages).

---

## Plan to fix #2 and #3

### Fix A — Stop the tab from dying on `confirm()` dialogs
In `src/components/CustomGamesAdmin.tsx`, replace both native `confirm(...)` calls (post/edit and delete) with the existing shadcn `AlertDialog` component (already in `src/components/ui/alert-dialog.tsx`). This keeps fullscreen intact because it's a DOM modal, not a browser chrome dialog.

Two confirm sites to convert:
- The "Post / Save changes" confirm inside `handleSubmit` → switch to a controlled `AlertDialog` triggered by the submit button; only run the upload + insert/update on confirm.
- The "Delete" confirm inside `remove` → use `AlertDialog` with destructive styling.

Also audit other admin components for `confirm(`/`alert(` so they don't trip the same trap (quick `rg` sweep; convert any hits the same way).

Optional hardening (not required, ask if you want it): make `FullscreenGate` ignore brief fullscreen exits — e.g. wait ~400ms and re-check `document.fullscreenElement` before terminating, so transient drops from native dialogs/file pickers don't kill the tab. I recommend this in addition to Fix A; left out by default since it changes the bunker-gate behavior.

### Fix B — Make Bob the Turtle AI and Turtle LM editable for testers
The Test page already shows an Education accordion sourced from `test_custom_games`. To make these two actually editable there, we need rows in `test_custom_games` for each:

1. Add a one-time migration that inserts two rows into `test_custom_games`:
   - `slug: 'bob-turtle-ai'`, category `education`, title "Bob the Turtle AI", `html` = contents of `public/games/bob-turtle-ai/index.html`.
   - `slug: 'turtle-lm'`, category `education`, title "Turtle LM", `html` = a starter HTML stub (since no real source exists yet).
2. Confirm `PlayTestGame` already serves `test_custom_games` by slug (it does, per `useTestGames.fetchTestGame`). The Education accordion's edit button on Test.tsx will then let any password-unlocked tester modify and re-upload.
3. Leave the public hub routes (`/bob-turtle-ai`, `/turtle-lm`) pointing at the existing pages — testers edit the test copy, then we can promote it to live later.

### Technical notes
- `AlertDialog` open state can be tracked with `useState<{ kind: 'submit' | 'delete'; id?: string } | null>`. The submit handler splits into `prepareSubmit` (validates, opens dialog) and `confirmSubmit` (runs the existing upload/insert logic).
- For the migration, the file content can be embedded as a single SQL string. Storage upload is not needed — `test_custom_games.html` accepts inline HTML the same way `custom_games` did before the storage refactor; `PlayTestGame` should render it directly. I'll verify this in `PlayTestGame.tsx` before implementing and adjust if it expects a URL.
- No changes to Bob's model or API key flow are needed for question #1; documenting the answer is enough.

### Out of scope
- Building a real Turtle LM (still under construction).
- Changing how `FullscreenGate` works on game routes (only the optional hardening above touches it).
