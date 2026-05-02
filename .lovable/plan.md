# Disable Public Admin Account Creation

## Problem
`src/pages/Login.tsx` currently has a "Need an account? Sign Up" toggle that calls `supabase.auth.signUp`. Anyone visiting `/login` can create an auth account. While the `user_roles` table's RLS prevents self-promotion to admin, exposing public sign-up on the **Admin Login** page is misleading and creates unnecessary auth users.

## Change
Convert `/login` into a sign-in-only page. Remove all sign-up state, the toggle button, and the `signUp` call.

### File edited
- `src/pages/Login.tsx`
  - Remove `isSignUp` state and the conditional sign-up branch in `handleSubmit`.
  - Remove the "Sign Up / Sign In" toggle button.
  - Update the heading to always read "Admin Login".
  - Add a small note: "Admin accounts are provisioned by an existing admin. Public sign-up is disabled."
  - Swap the password `Input` for the new `SecretInput` (consistent with the recent secret-input change).

## How new admins get created
- An existing admin inserts a row into `user_roles` with `role = 'admin'` for the target user (via the backend Users panel or a SQL migration).
- The auth user themselves is created by an existing admin from the backend Users panel — not via the public form.

## Out of scope
- No database / RLS changes. The `user_roles` policy already prevents self-assignment of the admin role; this change just removes the misleading public sign-up surface.
- The "Turtle LM" Figma game is a separate task — share the code and I'll integrate it after this is approved.
