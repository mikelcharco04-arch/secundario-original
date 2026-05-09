import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPER_ADMIN = Deno.env.get("TELEGRAM_ADMIN_ID") || "8585803145";

function genKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

Deno.serve(async (req) => {
  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const tgFetch = async (method: string, body: any) => {
    if (!TG) return null;
    try {
      const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      return await r.json();
    } catch (e) { console.error("tgFetch", method, e); return null; }
  };

  const isAdmin = async (id: string | number): Promise<boolean> => {
    const sid = String(id);
    if (sid === SUPER_ADMIN) return true;
    const { data } = await supabase.from("telegram_admins").select("telegram_id").eq("telegram_id", Number(sid)).maybeSingle();
    return !!data;
  };
  const isSuper = (id: string | number) => String(id) === SUPER_ADMIN;

  const log = async (adminId: string | number, action: string, target?: string, details?: any) => {
    try {
      await supabase.from("admin_action_logs").insert({ admin_id: String(adminId), action, target: target || null, details: details || null });
    } catch (e) { console.error("log fail", e); }
  };

  // Aprueba un pago: genera key Activa, marca pago, edita caption si hay msg
  const approvePayment = async (id: string, adminId: string | number, chatIdForMsg?: number, messageId?: number) => {
    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, msg: "No encontrado" };
    if (row.status !== "pending") return { ok: false, msg: `Ya estaba ${row.status}` };

    const newK = genKey();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Number(row.duration_ms)).toISOString();

    const { error: kErr } = await supabase.from("proxy_keys").insert({
      key: newK,
      type: row.key_type || "Normal",
      status: "Activa", // CRÍTICO: el login valida con status='Activa'
      duration: row.duration,
      duration_ms: row.duration_ms,
      device_fingerprint: row.device_fingerprint,
      email: row.email,
      payment_request_id: row.id,
    });
    if (kErr) {
      console.error("insert key fail", kErr);
      return { ok: false, msg: "Error creando key: " + kErr.message };
    }

    await supabase.from("payment_requests").update({
      status: "approved",
      delivered_key: newK,
      resolved_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", id);

    await log(adminId, "approve", id, { key: newK });

    const newCaption = `APROBADO\n\nUsuario: ${row.user_name}\nEmail: ${row.email || "(none)"}\nPlan: ${row.plan_label}\nKey: ${newK}\nExpira al activar: ${row.duration}\n(Activable en login con cualquier nombre)`;
    if (chatIdForMsg && messageId) {
      await tgFetch("editMessageCaption", { chat_id: chatIdForMsg, message_id: messageId, caption: newCaption });
    }
    return { ok: true, key: newK, msg: newCaption };
  };

  const rejectPayment = async (id: string, adminId: string | number, chatIdForMsg?: number, messageId?: number) => {
    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, msg: "No encontrado" };
    if (row.status !== "pending") return { ok: false, msg: `Ya estaba ${row.status}` };
    await supabase.from("payment_requests").update({
      status: "rejected", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", id);
    await log(adminId, "reject", id);
    const cap = `RECHAZADO\n\nUsuario: ${row.user_name}\nPlan: ${row.plan_label}`;
    if (chatIdForMsg && messageId) {
      await tgFetch("editMessageCaption", { chat_id: chatIdForMsg, message_id: messageId, caption: cap });
    }
    return { ok: true, msg: cap };
  };

  try {
    const update = await req.json();

    // ============ MENSAJES ============
    if (update?.message?.text) {
      const text: string = update.message.text.trim();
      const chatId = update.message.chat.id;
      const fromId = update.message.from?.id;

      const reply = (t: string) => tgFetch("sendMessage", { chat_id: chatId, text: t });

      if (!(await isAdmin(fromId))) {
        if (text === "/start" || text === "/help") await reply("No autorizado.");
        return new Response("ok");
      }

      const parts = text.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg1 = parts[1];
      const restArgs = parts.slice(2).join(" ");

      try {
        if (cmd === "/start" || cmd === "/help") {
          await reply([
            "COMANDOS DISPONIBLES",
            "",
            "PAGOS",
            "/aprobar <id>",
            "/rechazar <id>",
            "/reenviarkey <id|email>",
            "/regenerarkey <id>",
            "/verpagos [pending|approved|rejected]",
            "/ultimospagos",
            "",
            "KEYS",
            "/verkeys [Activa|Usada|Expirada|Bloqueada]",
            "/stockkeys",
            "",
            "USUARIOS",
            "/bloquearusuario <email> [razón]",
            "/desbloquearusuario <email>",
            "/verbloqueados",
            "/banpaymentid <id> [razón]",
            "/unbanpaymentid <id>",
            "",
            "ADMINS (super-admin)",
            "/agregaradmin <telegram_id>",
            "/eliminaradmin <telegram_id>",
            "",
            "CONTROL",
            "/logs",
            "/reintentartelegram <id>",
            "/reiniciarwebhook",
            "/verestado",
            "/panelstats",
            "/actividad",
          ].join("\n"));
          return new Response("ok");
        }

        // ============ PAGOS / KEYS ============
        if (cmd === "/aprobar") {
          if (!arg1) { await reply("Uso: /aprobar <id>"); return new Response("ok"); }
          const r = await approvePayment(arg1, fromId);
          await reply(r.msg);
          return new Response("ok");
        }
        if (cmd === "/rechazar") {
          if (!arg1) { await reply("Uso: /rechazar <id>"); return new Response("ok"); }
          const r = await rejectPayment(arg1, fromId);
          await reply(r.msg);
          return new Response("ok");
        }
        if (cmd === "/reenviarkey") {
          if (!arg1) { await reply("Uso: /reenviarkey <id|email>"); return new Response("ok"); }
          let q = supabase.from("payment_requests").select("*").eq("status", "approved").not("delivered_key", "is", null).order("resolved_at", { ascending: false }).limit(1);
          q = arg1.includes("@") ? q.eq("email", arg1.toLowerCase()) : q.eq("id", arg1);
          const { data: pr } = await q.maybeSingle();
          if (!pr) { await reply("No se encontró pago aprobado."); return new Response("ok"); }
          await log(fromId, "reenviarkey", arg1);
          await reply(`Key reenviada\nUsuario: ${pr.user_name}\nEmail: ${pr.email || "(none)"}\nKey: ${pr.delivered_key}\nPlan: ${pr.plan_label}`);
          return new Response("ok");
        }
        if (cmd === "/regenerarkey") {
          if (!arg1) { await reply("Uso: /regenerarkey <id>"); return new Response("ok"); }
          const { data: pr } = await supabase.from("payment_requests").select("*").eq("id", arg1).maybeSingle();
          if (!pr) { await reply("No encontrado"); return new Response("ok"); }
          if (pr.delivered_key) {
            await supabase.from("proxy_keys").update({ status: "Bloqueada" }).eq("key", pr.delivered_key);
          }
          const newK = genKey();
          await supabase.from("proxy_keys").insert({
            key: newK, type: pr.key_type || "Normal", status: "Activa",
            duration: pr.duration, duration_ms: pr.duration_ms,
            device_fingerprint: pr.device_fingerprint, email: pr.email, payment_request_id: pr.id,
          });
          await supabase.from("payment_requests").update({ delivered_key: newK, status: "approved", updated_at: new Date().toISOString() }).eq("id", pr.id);
          await log(fromId, "regenerarkey", arg1, { old: pr.delivered_key, new: newK });
          await reply(`Key regenerada\nAnterior bloqueada: ${pr.delivered_key || "(none)"}\nNueva: ${newK}\nPlan: ${pr.plan_label}`);
          return new Response("ok");
        }
        if (cmd === "/verpagos") {
          let q = supabase.from("payment_requests").select("id,user_name,email,plan_label,status,created_at").order("created_at", { ascending: false }).limit(15);
          if (arg1 && ["pending", "approved", "rejected"].includes(arg1.toLowerCase())) q = q.eq("status", arg1.toLowerCase());
          const { data } = await q;
          const lines = (data || []).map((p: any) => `${p.status[0].toUpperCase()} ${p.id.slice(0, 8)} ${p.user_name} ${p.plan_label}`);
          await reply(lines.length ? lines.join("\n") : "Sin resultados");
          return new Response("ok");
        }
        if (cmd === "/ultimospagos") {
          const { data } = await supabase.from("payment_requests").select("id,user_name,plan_label,status,created_at").order("created_at", { ascending: false }).limit(10);
          const lines = (data || []).map((p: any) => `[${p.status}] ${p.id.slice(0, 8)} - ${p.user_name} - ${p.plan_label} - ${new Date(p.created_at).toLocaleString("es-ES")}`);
          await reply(lines.length ? lines.join("\n") : "Sin pagos");
          return new Response("ok");
        }
        if (cmd === "/verkeys") {
          let q = supabase.from("proxy_keys").select("key,status,duration,used_by,created_at").order("created_at", { ascending: false }).limit(15);
          if (arg1) q = q.eq("status", arg1);
          const { data } = await q;
          const lines = (data || []).map((k: any) => `${k.status[0]} ${k.key} ${k.duration}${k.used_by ? " > " + k.used_by : ""}`);
          await reply(lines.length ? lines.join("\n") : "Sin keys");
          return new Response("ok");
        }
        if (cmd === "/stockkeys") {
          const { data } = await supabase.from("proxy_keys").select("duration,status").eq("status", "Activa");
          const counts: Record<string, number> = {};
          (data || []).forEach((k: any) => { counts[k.duration] = (counts[k.duration] || 0) + 1; });
          const lines = Object.entries(counts).map(([d, n]) => `${d}: ${n} activas`);
          await reply(lines.length ? "STOCK ACTIVAS\n" + lines.join("\n") : "Sin stock activo");
          return new Response("ok");
        }

        // ============ USUARIOS ============
        if (cmd === "/bloquearusuario") {
          if (!arg1) { await reply("Uso: /bloquearusuario <email> [razón]"); return new Response("ok"); }
          const em = arg1.toLowerCase();
          await supabase.from("blocked_users").upsert({ email: em, blocked_by: String(fromId), reason: restArgs || null }, { onConflict: "email" });
          await supabase.from("active_users").update({ blocked: true }).eq("name", arg1);
          await log(fromId, "bloquearusuario", em, { reason: restArgs });
          await reply(`Bloqueado: ${em}`);
          return new Response("ok");
        }
        if (cmd === "/desbloquearusuario") {
          if (!arg1) { await reply("Uso: /desbloquearusuario <email>"); return new Response("ok"); }
          const em = arg1.toLowerCase();
          await supabase.from("blocked_users").delete().eq("email", em);
          await log(fromId, "desbloquearusuario", em);
          await reply(`Desbloqueado: ${em}`);
          return new Response("ok");
        }
        if (cmd === "/verbloqueados") {
          const { data } = await supabase.from("blocked_users").select("email,reason,created_at").order("created_at", { ascending: false }).limit(30);
          const lines = (data || []).map((b: any) => `${b.email}${b.reason ? " - " + b.reason : ""}`);
          await reply(lines.length ? "BLOQUEADOS\n" + lines.join("\n") : "Sin bloqueados");
          return new Response("ok");
        }
        if (cmd === "/banpaymentid") {
          if (!arg1) { await reply("Uso: /banpaymentid <id> [razón]"); return new Response("ok"); }
          await supabase.from("banned_payments").upsert({ payment_id: arg1, reason: restArgs || null }, { onConflict: "payment_id" });
          await log(fromId, "banpaymentid", arg1, { reason: restArgs });
          await reply(`Pago baneado: ${arg1}`);
          return new Response("ok");
        }
        if (cmd === "/unbanpaymentid") {
          if (!arg1) { await reply("Uso: /unbanpaymentid <id>"); return new Response("ok"); }
          await supabase.from("banned_payments").delete().eq("payment_id", arg1);
          await log(fromId, "unbanpaymentid", arg1);
          await reply(`Pago desbaneado: ${arg1}`);
          return new Response("ok");
        }

        // ============ ADMINS ============
        if (cmd === "/agregaradmin") {
          if (!isSuper(fromId)) { await reply("Solo super-admin"); return new Response("ok"); }
          if (!arg1 || isNaN(Number(arg1))) { await reply("Uso: /agregaradmin <telegram_id>"); return new Response("ok"); }
          await supabase.from("telegram_admins").upsert({ telegram_id: Number(arg1), added_by: String(fromId) }, { onConflict: "telegram_id" });
          await log(fromId, "agregaradmin", arg1);
          await reply(`Admin agregado: ${arg1}`);
          return new Response("ok");
        }
        if (cmd === "/eliminaradmin") {
          if (!isSuper(fromId)) { await reply("Solo super-admin"); return new Response("ok"); }
          if (!arg1) { await reply("Uso: /eliminaradmin <telegram_id>"); return new Response("ok"); }
          await supabase.from("telegram_admins").delete().eq("telegram_id", Number(arg1));
          await log(fromId, "eliminaradmin", arg1);
          await reply(`Admin eliminado: ${arg1}`);
          return new Response("ok");
        }

        // ============ CONTROL ============
        if (cmd === "/logs") {
          const { data } = await supabase.from("admin_action_logs").select("admin_id,action,target,created_at").order("created_at", { ascending: false }).limit(20);
          const lines = (data || []).map((l: any) => `${new Date(l.created_at).toLocaleTimeString("es-ES")} ${l.admin_id} ${l.action} ${l.target || ""}`);
          await reply(lines.length ? "ÚLTIMOS LOGS\n" + lines.join("\n") : "Sin logs");
          return new Response("ok");
        }
        if (cmd === "/reintentartelegram") {
          if (!arg1) { await reply("Uso: /reintentartelegram <id>"); return new Response("ok"); }
          const { data: pr } = await supabase.from("payment_requests").select("*").eq("id", arg1).maybeSingle();
          if (!pr) { await reply("No encontrado"); return new Response("ok"); }
          const caption = `REENVÍO\nUsuario: ${pr.user_name}\nEmail: ${pr.email || "(none)"}\nID: ${pr.id}\nPlan: ${pr.plan_label}\nEstado: ${pr.status}`;
          const payload: any = {
            chat_id: chatId, caption,
            reply_markup: { inline_keyboard: [[
              { text: "Aprobar", callback_data: `approve:${pr.id}` },
              { text: "Rechazar", callback_data: `reject:${pr.id}` },
            ], [{ text: "Bloquear usuario", callback_data: `block:${pr.id}` }]] },
          };
          if (pr.receipt_type === "video") payload.video = pr.proof_url; else payload.photo = pr.proof_url;
          await tgFetch(pr.receipt_type === "video" ? "sendVideo" : "sendPhoto", payload);
          await log(fromId, "reintentartelegram", arg1);
          return new Response("ok");
        }
        if (cmd === "/reiniciarwebhook") {
          const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
          const r = await tgFetch("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
          await log(fromId, "reiniciarwebhook", url);
          await reply(`Webhook: ${JSON.stringify(r)}`);
          return new Response("ok");
        }
        if (cmd === "/verestado") {
          const { count: pendingC } = await supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
          const wh = await tgFetch("getWebhookInfo", {});
          await reply(`ESTADO\nDB: OK\nPendientes: ${pendingC ?? "?"}\nTG token: ${TG ? "OK" : "FALTA"}\nWebhook: ${wh?.result?.url || "?"}`);
          return new Response("ok");
        }
        if (cmd === "/panelstats") {
          const [{ count: total }, { count: approved }, { count: pending }, { count: rejected }, { count: keysActive }, { count: keysUsed }] = await Promise.all([
            supabase.from("payment_requests").select("*", { count: "exact", head: true }),
            supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
            supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
            supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Activa"),
            supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Usada"),
          ]);
          const { data: rev } = await supabase.from("payment_requests").select("amount,currency").eq("status", "approved");
          const usd = (rev || []).filter((r: any) => r.currency === "USD").reduce((s: number, r: any) => s + Number(r.amount), 0);
          const dia = (rev || []).filter((r: any) => r.currency === "DIAMONDS").reduce((s: number, r: any) => s + Number(r.amount), 0);
          await reply(`ESTADÍSTICAS\nPagos: ${total} (✓${approved} ⏳${pending} ✗${rejected})\nKeys activas: ${keysActive} | usadas: ${keysUsed}\nIngresos: $${usd} USD + ${dia} 💎`);
          return new Response("ok");
        }
        if (cmd === "/actividad") {
          const { data: pays } = await supabase.from("payment_requests").select("user_name,plan_label,status,created_at").order("created_at", { ascending: false }).limit(5);
          const { data: logs } = await supabase.from("admin_action_logs").select("admin_id,action,target,created_at").order("created_at", { ascending: false }).limit(5);
          const lines = [
            "ÚLTIMAS COMPRAS",
            ...(pays || []).map((p: any) => `${p.user_name} ${p.plan_label} [${p.status}]`),
            "",
            "ÚLTIMAS ACCIONES",
            ...(logs || []).map((l: any) => `${l.admin_id} ${l.action} ${l.target || ""}`),
          ];
          await reply(lines.join("\n"));
          return new Response("ok");
        }

        await reply("Comando no reconocido. /help");
      } catch (e) {
        console.error("cmd error", e);
        await reply("Error: " + (e instanceof Error ? e.message : "x"));
      }
      return new Response("ok");
    }

    // ============ CALLBACK BOTONES ============
    const cb = update?.callback_query;
    if (!cb) return new Response("ok");

    const fromId = cb.from?.id;
    if (!(await isAdmin(fromId))) {
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "No autorizado", show_alert: true });
      return new Response("ok");
    }

    const data: string = cb.data || "";
    const [action, id] = data.split(":");
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;

    if (action === "approve") {
      const r = await approvePayment(id, fromId, chatId, messageId);
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: r.ok ? `Aprobado: ${r.key}` : r.msg, show_alert: !r.ok });
      return new Response("ok");
    }
    if (action === "reject") {
      const r = await rejectPayment(id, fromId, chatId, messageId);
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: r.ok ? "Rechazado" : r.msg, show_alert: !r.ok });
      return new Response("ok");
    }
    if (action === "block") {
      const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).maybeSingle();
      if (!row) { await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "No encontrado" }); return new Response("ok"); }
      if (row.email) await supabase.from("blocked_users").upsert({ email: row.email, blocked_by: String(fromId), reason: "block button" }, { onConflict: "email" });
      if (row.device_fingerprint) await supabase.from("proxy_keys").update({ status: "Bloqueada" }).eq("device_fingerprint", row.device_fingerprint);
      await supabase.from("active_users").update({ blocked: true }).eq("name", row.user_name);
      await log(fromId, "block-button", id);
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: `Bloqueado: ${row.email || row.user_name}`, show_alert: true });
      return new Response("ok");
    }

    return new Response("ok");
  } catch (e) {
    console.error(e);
    return new Response("ok");
  }
});
