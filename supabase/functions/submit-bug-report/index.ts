// Accepts a bug report from a visitor: name, game, title, description,
// optional screenshot (base64 data URL), plus auto-collected browser info.
// Uploads the screenshot to the public `game-files` bucket under bug-reports/
// and inserts a feedback row tagged `bug:<game>`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT = 3;
const WINDOW_MS = 60_000;
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024; // 3 MB after decoding
const buckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (buckets.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    buckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  buckets.set(ip, recent);
  return false;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = dataUrl.match(/^data:([\w./+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  try {
    const binary = atob(m[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return jsonError("Too many submissions. Please wait a minute and try again.", 429);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError("Invalid request body", 400);

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const game = typeof body.game === "string" ? body.game.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : "";
    const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 500) : "";
    const screenshot = typeof body.screenshot === "string" ? body.screenshot : "";

    if (name.length < 1 || name.length > 100) return jsonError("Name must be 1–100 characters.", 400);
    if (game.length < 1 || game.length > 60) return jsonError("Game is required.", 400);
    if (title.length < 1 || title.length > 150) return jsonError("Title must be 1–150 characters.", 400);
    if (description.length < 1 || description.length > 4000)
      return jsonError("Description must be 1–4000 characters.", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let screenshotUrl = "";
    if (screenshot) {
      const decoded = decodeDataUrl(screenshot);
      if (!decoded) return jsonError("Screenshot must be a base64 data URL.", 400);
      if (decoded.bytes.byteLength > MAX_SCREENSHOT_BYTES)
        return jsonError("Screenshot too large (3 MB max).", 400);
      if (!decoded.mime.startsWith("image/"))
        return jsonError("Screenshot must be an image.", 400);

      const ext = decoded.mime.split("/")[1]?.split("+")[0] || "png";
      const path = `bug-reports/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("game-files")
        .upload(path, decoded.bytes, { contentType: decoded.mime, upsert: false });
      if (upErr) {
        console.error("Screenshot upload error:", upErr);
        return jsonError("Failed to upload screenshot.", 500);
      }
      const { data: pub } = supabase.storage.from("game-files").getPublicUrl(path);
      screenshotUrl = pub.publicUrl;
    }

    const composedMessage =
      `[BUG REPORT]\n` +
      `Game: ${game}\n` +
      `Title: ${title}\n\n` +
      `${description}\n\n` +
      `---\nPage: ${pageUrl || "(unknown)"}\n` +
      `User Agent: ${userAgent || "(unknown)"}\n` +
      (screenshotUrl ? `Screenshot: ${screenshotUrl}\n` : "");

    // The `feedback.message` column allows up to ~4500 chars in our schema; clamp safely.
    const finalMessage = composedMessage.slice(0, 4500);

    const { error } = await supabase.from("feedback").insert({
      name,
      message: finalMessage,
      category: `bug:${game}`.slice(0, 50),
    });
    if (error) {
      console.error("Insert error:", error);
      return jsonError("Failed to save bug report.", 500);
    }

    return new Response(JSON.stringify({ ok: true, screenshotUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-bug-report error:", err);
    return jsonError("Unexpected error.", 500);
  }
});
