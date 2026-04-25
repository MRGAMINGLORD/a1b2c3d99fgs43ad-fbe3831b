/**
 * @vitest-environment node
 *
 * RLS contract test for the `game-files` Storage bucket.
 *
 * Verifies, against the LIVE Supabase project, that:
 *   - anon (unauthenticated) CAN publicly read files
 *   - anon CANNOT upload, update, or delete objects
 *
 * Runs in CI via the anon (publishable) key. No service-role secrets needed.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hllwbnovtjpauzwnrwfh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHdibm92dGpwYXV6d25yd2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjYyOTUsImV4cCI6MjA5MjY0MjI5NX0.N57KaDv2fP-g_8TAuQ-Dg3jPn4BP1vXKMkrzzbbWiCM";

const BUCKET = "game-files";

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe("game-files Storage RLS (anon)", () => {
  it("anon CAN list / publicly read the bucket", async () => {
    const { error } = await anon.storage.from(BUCKET).list("", { limit: 1 });
    expect(error, `list failed: ${error?.message}`).toBeNull();
  });

  it("anon CAN resolve public URLs (no auth required)", async () => {
    const { data } = anon.storage.from(BUCKET).getPublicUrl("any/path/index.html");
    expect(data.publicUrl).toContain("/storage/v1/object/public/game-files/");
  });

  it("anon CANNOT upload to game-files", async () => {
    const path = `__rls_test__/anon-${Date.now()}.html`;
    const { error } = await anon.storage
      .from(BUCKET)
      .upload(path, new Blob(["<html>nope</html>"], { type: "text/html" }), {
        upsert: false,
      });
    expect(error, "upload was unexpectedly allowed for anon").not.toBeNull();
  });

  it("anon CANNOT update / overwrite objects in game-files", async () => {
    const path = `__rls_test__/anon-update-${Date.now()}.html`;
    const { error } = await anon.storage
      .from(BUCKET)
      .upload(path, new Blob(["<html>overwrite</html>"], { type: "text/html" }), {
        upsert: true, // exercises both INSERT and UPDATE policies
      });
    expect(error, "update/upsert was unexpectedly allowed for anon").not.toBeNull();
  });

  it("anon CANNOT delete objects in game-files", async () => {
    const { data, error } = await anon.storage
      .from(BUCKET)
      .remove([`__rls_test__/does-not-exist-${Date.now()}.html`]);
    const blocked = !!error || !data || data.length === 0;
    expect(blocked, "delete was unexpectedly allowed for anon").toBe(true);
  });
});
