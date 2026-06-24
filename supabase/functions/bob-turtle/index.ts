// Bob the Turtle AI — Gemini proxy.
// Keeps the GEMINI_API_KEY server-side so it stays out of the committed
// client bundle (and out of GitHub secret scanning).
//
// Request body:
//   { kind: "text", model?: string, payload: <generateContent body> }
//   { kind: "image", model?: string, payload: <predict body> }
//
// The function forwards `payload` verbatim to the matching Google
// Generative Language endpoint and returns the JSON response.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TEXT_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
]);
const ALLOWED_IMAGE_MODELS = new Set([
  "imagen-4.0-generate-001",
  "imagen-3.0-generate-002",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      500,
    );
  }

  let body: { kind?: string; model?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const kind = body?.kind;
  const payload = body?.payload;
  if (!payload || typeof payload !== "object") {
    return json({ error: "`payload` is required." }, 400);
  }

  let url: string;
  if (kind === "text") {
    const model = body.model ?? "gemini-2.5-flash";
    if (!ALLOWED_TEXT_MODELS.has(model)) {
      return json({ error: `Model not allowed: ${model}` }, 400);
    }
    url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  } else if (kind === "image") {
    const model = body.model ?? "imagen-4.0-generate-001";
    if (!ALLOWED_IMAGE_MODELS.has(model)) {
      return json({ error: `Model not allowed: ${model}` }, 400);
    }
    url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  } else {
    return json({ error: "`kind` must be 'text' or 'image'." }, 400);
  }

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    console.error("bob-turtle proxy error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Unknown upstream error" },
      502,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
