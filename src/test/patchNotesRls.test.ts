/**
 * RLS contract test for the `patch_notes` table.
 *
 * Verifies, against the LIVE Supabase project, that:
 *   - anon (unauthenticated) can SELECT
 *   - anon CANNOT INSERT, UPDATE, or DELETE
 *
 * Runs in CI via the anon (publishable) key. No service-role secrets needed.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hllwbnovtjpauzwnrwfh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHdibm92dGpwYXV6d25yd2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjYyOTUsImV4cCI6MjA5MjY0MjI5NX0.N57KaDv2fP-g_8TAuQ-Dg3jPn4BP1vXKMkrzzbbWiCM";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("patch_notes RLS (anon)", () => {
  it("anon CAN read patch_notes", async () => {
    const { error, status } = await anon
      .from("patch_notes")
      .select("id")
      .limit(1);
    expect(error, `select failed: ${error?.message}`).toBeNull();
    expect(status).toBeLessThan(400);
  });

  it("anon CANNOT insert into patch_notes", async () => {
    const { data, error } = await anon
      .from("patch_notes")
      .insert({ title: "rls-test", content: "should fail" })
      .select();
    // RLS rejection: either an error or zero rows returned
    const blocked = !!error || !data || data.length === 0;
    expect(blocked, "insert was unexpectedly allowed for anon").toBe(true);
  });

  it("anon CANNOT update patch_notes", async () => {
    const { data, error } = await anon
      .from("patch_notes")
      .update({ title: "hacked" })
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    const blocked = !!error || !data || data.length === 0;
    expect(blocked, "update was unexpectedly allowed for anon").toBe(true);
  });

  it("anon CANNOT delete patch_notes", async () => {
    const { data, error } = await anon
      .from("patch_notes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    const blocked = !!error || !data || data.length === 0;
    expect(blocked, "delete was unexpectedly allowed for anon").toBe(true);
  });
});
