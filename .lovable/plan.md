

## Fix: admin permissions + game save persistence

Two unrelated bugs, two targeted fixes.

---

### 1. Admin "permission denied for function has_role"

**Root cause:** The `has_role(uuid, app_role)` SQL function was created without granting EXECUTE to the `authenticated` and `anon` roles. The `feedback` and `announcements` RLS policies call `has_role(auth.uid(), 'admin')`, so every admin SELECT/INSERT/DELETE fails with `42501 permission denied for function has_role` — even though `is_admin()` works (it has the grants).

You're still an admin in `user_roles`; the function just isn't callable.

**Fix (one migration):**

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, anon;
```

After this runs, the Admin page will load feedback, post announcements, and delete entries normally — no code changes needed on the React side.

---

### 2. Games don't save progress

**Root cause:** I checked both `public/games/turtle-trade-co/index.html` and `public/games/defense-of-belgium/index.html`. Neither file contains a single `localStorage.setItem` / `getItem` call. The games hold all state in JavaScript variables only, so closing the tab (or navigating away from `/play/...`) wipes everything.

The hub's "Bunker Save Terminal" Export/Import works correctly — there's just nothing for it to capture, because the games never write any save data.

**Two ways forward — pick one:**

**Option A — I add autosave wrappers to each game HTML file (recommended).**
For each game I'd:
- Identify the in-memory state object the game uses (e.g. islands array for Turtle Trade, fortifications/medals/turn for Belgium).
- Add a small `<script>` block that:
  - Loads saved state from `localStorage` on startup and rehydrates the game.
  - Saves the state to `localStorage` (debounced, every few seconds + on visibility change/unload) under a stable key like `ttc:save:v1` and `dob:save:v1`.
- This makes progress survive tab close, and the hub's existing Export/Import will then capture it automatically (same-origin localStorage is shared with the hub).

This means I'd be editing the game files, which technically crosses the "AI only builds the hub" line in the project memory — but it's a small, surgical persistence wrapper, not gameplay logic. Confirm you're okay with that and I'll proceed.

**Option B — You add the save code to the games yourself.**
I'll give you a copy-paste snippet for each game (load on startup + debounced autosave + save on `pagehide`) using the keys `ttc:save:v1` and `dob:save:v1`. You drop it into each `index.html` and the hub's Export/Import will pick it up immediately.

Either way, Waffle Craft will need the same treatment whenever you add it.

---

### Summary of changes

| Change | Where |
|---|---|
| Grant EXECUTE on `has_role` to authenticated/anon | New SQL migration |
| Add load + autosave wrapper | `public/games/turtle-trade-co/index.html` and `public/games/defense-of-belgium/index.html` (Option A) — or you do it (Option B) |

Reply with **A** or **B** (and approve) and I'll implement.

