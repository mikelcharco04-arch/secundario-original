import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function genKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

Deno.serve(async (req) => {
  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const tgFetch = async (method: string, body: any) => {
    if (!TG) return;
    try {
      await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } catch (e) { console.error("tgFetch", method, e); }
  };

  try {
    const update = await req.json();

    // ==== MENSAJES (comandos) ====
    if (update?.message?.text) {
      const text: string = update.message.text.trim();
      const chatId = update.message.chat.id;

      if (text.startsWith("/reenviarkey")) {
        const parts = text.split(/\s+/);
        const arg = parts[1];
        if (!arg) {
          await tgFetch("sendMessage", { chat_id: chatId, text: "Uso: /reenviarkey <payment_id o email>" });
          return new Response("ok");
        }
        let q = supabase.from("payment_requests").select("*").eq("status", "approved").not("delivered_key", "is", null).order("resolved_at", { ascending: false }).limit(1);
        if (arg.includes("@")) q = q.eq("email", arg); else q = q.eq("id", arg);
        const { data: pr } = await q.maybeSingle();
        if (!pr) {
          await tgFetch("sendMessage", { chat_id: chatId, text: "No se encontró pago aprobado." });
          return new Response("ok");
        }
        await tgFetch("sendMessage", {
          chat_id: chatId,
          text: `Key reenviada\nUsuario: ${pr.user_name}\nEmail: ${pr.email || "(none)"}\nKey: ${pr.delivered_key}\nPlan: ${pr.plan_label}`,
        });
        return new Response("ok");
      }

      if (text.startsWith("/bloquear")) {
        const arg = text.split(/\s+/)[1];
        if (!arg) {
          await tgFetch("sendMessage", { chat_id: chatId, text: "Uso: /bloquear <nombre_usuario o key>" });
          return new Response("ok");
        }
        const r1 = await supabase.from("active_users").update({ blocked: true }).or(`name.eq.${arg},key.eq.${arg}`);
        await tgFetch("sendMessage", { chat_id: chatId, text: `Usuario "${arg}" bloqueado. (${r1.error ? "ERR: " + r1.error.message : "ok"})` });
        return new Response("ok");
      }

      if (text === "/start" || text === "/help") {
        await tgFetch("sendMessage", { chat_id: chatId, text: "Comandos:\n/reenviarkey <id|email>\n/bloquear <usuario|key>" });
      }
      return new Response("ok");
    }

    // ==== CALLBACK BUTTONS ====
    const cb = update?.callback_query;
    if (!cb) return new Response("ok");

    const data: string = cb.data || "";
    const [action, id] = data.split(":");
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;

    const answer = (text: string) => tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: false });
    const editCaption = (newCaption: string) => tgFetch("editMessageCaption", { chat_id: chatId, message_id: messageId, caption: newCaption });

    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).single();
    if (!row) { await answer("No encontrado"); return new Response("ok"); }

    if (action === "block") {
      if (row.device_fingerprint) {
        await supabase.from("proxy_keys").update({ status: "Bloqueada" }).eq("device_fingerprint", row.device_fingerprint);
      }
      await supabase.from("active_users").update({ blocked: true }).eq("name", row.user_name);
      await answer(`Usuario ${row.user_name} bloqueado`);
      return new Response("ok");
    }

    if (row.status !== "pending") { await answer(`Ya estaba ${row.status}`); return new Response("ok"); }

    if (action === "approve") {
      const newK = genKey();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + Number(row.duration_ms)).toISOString();
      await supabase.from("proxy_keys").insert({
        key: newK,
        type: row.key_type,
        status: "Activa",
        duration: row.duration,
        duration_ms: row.duration_ms,
        device_fingerprint: row.device_fingerprint,
        email: row.email,
        payment_request_id: row.id,
      });

      await supabase.from("payment_requests").update({
        status: "approved",
        delivered_key: newK,
        resolved_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq("id", id);

      await editCaption(`APROBADO\n\nUsuario: ${row.user_name}\nEmail: ${row.email || "(none)"}\nPlan: ${row.plan_label}\nKey: ${newK}\nExpira: ${expiresAt}`);
      await answer("Aprobado");
    } else if (action === "reject") {
      await supabase.from("payment_requests").update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      await editCaption(`RECHAZADO\n\nUsuario: ${row.user_name}\nPlan: ${row.plan_label}`);
      await answer("Rechazado");
    }

    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("ok");
  }
});
