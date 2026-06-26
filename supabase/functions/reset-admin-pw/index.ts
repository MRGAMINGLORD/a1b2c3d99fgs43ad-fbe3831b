import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);
  const email = "mrgaminglordfuzz@gmail.com";
  const password = "LATTEISCUTE";

  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = list?.users.find((u) => (u.email ?? "").toLowerCase() === email) ?? null;

  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: error?.message ?? "create failed" }), { status: 500 });
    }
    user = data.user;
  }

  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) return new Response(JSON.stringify({ error: roleErr.message, id: user.id }), { status: 500 });

  return new Response(JSON.stringify({ ok: true, id: user.id, email }), {
    headers: { "content-type": "application/json" },
  });
});

