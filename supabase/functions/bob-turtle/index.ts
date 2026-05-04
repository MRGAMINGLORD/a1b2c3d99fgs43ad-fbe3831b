// ─────────────────────────────────────────────────────────────
// BOB THE TURTLE — edge function placeholder.
//
// Replace this entire file with your own backend code. The
// function is auto-deployed on save. Default export must be
// `Deno.serve(...)` or use `serve(...)` from std/http.
// ─────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error:
        "Bob the Turtle backend is not configured. Paste your edge function code into supabase/functions/bob-turtle/index.ts.",
    }),
    {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
