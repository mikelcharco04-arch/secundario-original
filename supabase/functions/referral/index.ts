import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbC678PIyPtc7iERCH2R";
const GOAL = 20;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `REF-${out}`;
}

function genName(): string {
  const adj = ["Fast", "Cool", "Neon", "Pixel", "Nova", "Shadow", "Cyber", "Wild", "Prime", "Turbo"];
  const noun = ["Fox", "Wolf", "Tiger", "Panda", "Falcon", "Rider", "Ninja", "Storm", "Ghost", "Hero"];
  return `${adj[Math.floor(Math.random() * adj.length)]}${noun[Math.floor(Math.random() * noun.length)]}${Math.floor(Math.random() * 9999)}`;
}

const NAME_RE = /^[A-Za-z0-9_]{4,20}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function issueKeyIfComplete(userRow: any) {
  if (userRow.key_generated || userRow.valid_count < GOAL) return userRow;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const key = `PROXY-${seg()}-${seg()}`;
  const durationMs = 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();
  await supabase.from("proxy_keys").insert({
    key, type: "Normal", status: "Activa",
    duration: "1 día", duration_ms: durationMs, created_at: new Date().toISOString(),
  });
  const { data } = await supabase.from("referral_users").update({
    key_generated: key, key_expires_at: expiresAt,
  }).eq("id", userRow.id).select().single();
  return data ?? { ...userRow, key_generated: key, key_expires_at: expiresAt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // path like /referral/visit/REF-XXXXXX or /referral (POST body {action})
  const parts = url.pathname.split("/").filter(Boolean);
  // Last two segments are usually [functionName, sub?]
  const sub = parts[parts.length - 1] === "referral" ? "" : parts[parts.length - 1];

  try {
    // ---- VISIT redirect (GET) ----
    if (req.method === "GET" && url.searchParams.get("code")) {
      const code = url.searchParams.get("code")!.toUpperCase();
      const fp = url.searchParams.get("fp") || "unknown";
      const ip = getIp(req);
      const ua = req.headers.get("user-agent") || "unknown";
      await recordVisit(code, fp, ip, ua);
      return Response.redirect(WHATSAPP_CHANNEL, 302);
    }

    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ---- GENERATE NAME ----
    if (action === "generate-name") {
      for (let i = 0; i < 20; i++) {
        const name = genName();
        const { data } = await supabase.from("referral_users").select("id").eq("name", name).maybeSingle();
        if (!data) return json({ name });
      }
      return json({ error: "no se pudo generar" }, 500);
    }

    // ---- REGISTER ----
    if (action === "register") {
      const name = String(body.name || "").trim();
      const fingerprint = String(body.fingerprint || "").trim();
      if (!NAME_RE.test(name)) return json({ error: "Nombre inválido. Solo letras, números y _, 4–20 caracteres." }, 400);
      if (!fingerprint || fingerprint.length < 8) return json({ error: "Dispositivo no identificado." }, 400);

      const { data: existing } = await supabase.from("referral_users").select("id").eq("name", name).maybeSingle();
      if (existing) return json({ error: "Este nombre ya está registrado. Prueba otro o genera uno automáticamente." }, 409);

      const { data: dup } = await supabase.from("referral_users")
        .select("id, name, code").eq("owner_fingerprint", fingerprint).maybeSingle();
      if (dup) return json({ error: "Ya existe una cuenta en este dispositivo.", existing: dup }, 409);

      let code = genCode();
      for (let i = 0; i < 5; i++) {
        const { data: c } = await supabase.from("referral_users").select("id").eq("code", code).maybeSingle();
        if (!c) break;
        code = genCode();
      }
      const origin = req.headers.get("origin") || body.origin || "";
      const link = `${origin}/r/${code}`;
      const ip = getIp(req);
      const ipHash = await sha256(ip);

      const { data: created, error } = await supabase.from("referral_users").insert({
        name, code, link,
        owner_fingerprint: fingerprint,
        owner_ip_hash: ipHash,
        last_activity_at: new Date().toISOString(),
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ user: created });
    }

    // ---- STATUS ----
    if (action === "status") {
      const code = String(body.code || "").toUpperCase();
      if (!code) return json({ error: "code requerido" }, 400);
      const { data } = await supabase.from("referral_users").select("*").eq("code", code).maybeSingle();
      if (!data) return json({ error: "no encontrado" }, 404);
      const updated = await issueKeyIfComplete(data);
      return json({ user: updated, goal: GOAL });
    }

    return json({ error: "acción desconocida" }, 400);
  } catch (e: any) {
    return json({ error: e?.message || "error" }, 500);
  }
});

async function recordVisit(code: string, fp: string, ip: string, ua: string) {
  const { data: user } = await supabase.from("referral_users")
    .select("id, valid_count, rejected_count, blocked, owner_fingerprint, owner_ip_hash").eq("code", code).maybeSingle();
  if (!user) return;

  const ipHash = await sha256(ip);
  const uaHash = await sha256(ua);
  const combined = await sha256(`${fp}|${ipHash}|${uaHash}`);

  let valid = true;
  let reason: string | null = null;

  if (user.blocked) { valid = false; reason = "usuario bloqueado"; }
  else if (!fp || fp === "unknown" || fp.length < 8) { valid = false; reason = "sin fingerprint"; }
  else if (/bot|crawl|spider|curl|wget|python|http/i.test(ua)) { valid = false; reason = "bot"; }
  else if (fp === user.owner_fingerprint || ipHash === user.owner_ip_hash) { valid = false; reason = "mismo dueño"; }
  else {
    const { data: prev } = await supabase.from("referral_visits")
      .select("id").eq("referral_code", code).eq("combined_hash", combined).eq("valid", true).maybeSingle();
    if (prev) { valid = false; reason = "duplicado"; }
  }

  const { error: insErr } = await supabase.from("referral_visits").insert({
    referral_code: code,
    visitor_fingerprint: fp,
    visitor_ip_hash: ipHash,
    user_agent_hash: uaHash,
    combined_hash: combined,
    valid, rejection_reason: reason,
  });
  // If unique index blocked the insert, it's a duplicate — mark invalid
  if (insErr && valid) {
    valid = false; reason = "duplicado";
    await supabase.from("referral_visits").insert({
      referral_code: code, visitor_fingerprint: fp, visitor_ip_hash: ipHash,
      user_agent_hash: uaHash, combined_hash: combined + ":dup:" + Date.now(),
      valid: false, rejection_reason: reason,
    });
  }

  const patch: any = { last_activity_at: new Date().toISOString() };
  if (valid) patch.valid_count = (user.valid_count ?? 0) + 1;
  else patch.rejected_count = (user.rejected_count ?? 0) + 1;
  const { data: updated } = await supabase.from("referral_users").update(patch).eq("id", user.id).select().single();
  if (updated) await issueKeyIfComplete(updated);
}
