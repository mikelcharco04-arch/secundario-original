import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPER_ADMIN = Deno.env.get("TELEGRAM_ADMIN_ID") || "8585803145";
const BOT_PASSWORD = "valhalla117";

// ============================================================
// Ryuk Auxiliar · Telegram Bot
//
// Fuente única de verdad = tabla `proxy_keys` (misma que /admin).
// No hay lógica paralela: TODO se genera / consulta contra la BD.
// ============================================================

function genKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

const DURATION_MS: Record<string, number> = {
  "1 minuto": 60 * 1000,
  "1 día": 24 * 60 * 60 * 1000,
  "7 días": 7 * 24 * 60 * 60 * 1000,
  "30 días": 30 * 24 * 60 * 60 * 1000,
};

// Sesiones en memoria (por chat_id). Se resetean con el frío del edge, pero
// como pedimos password en cada /start igualmente es seguro.
const sessions = new Map<number, {
  authed: boolean;
  step?: "await_password" | "gen_duration" | "gen_qty";
  keyType?: "Normal" | "Premium";
  duration?: string;
}>();

const mainKeyboard = {
  keyboard: [
    [{ text: "Generar Key" }, { text: "Stock" }],
    [{ text: "Pagos pendientes" }, { text: "Últimos pagos" }],
    [{ text: "Últimas keys" }, { text: "Estadísticas" }],
    [{ text: "Estado" }, { text: "Ayuda" }],
    [{ text: "Salir" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

const durationKeyboard = {
  keyboard: [
    [{ text: "1 minuto" }, { text: "1 día" }],
    [{ text: "7 días" }, { text: "30 días" }],
    [{ text: "Cancelar" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

const qtyKeyboard = {
  keyboard: [
    [{ text: "1" }, { text: "5" }, { text: "10" }],
    [{ text: "25" }, { text: "50" }, { text: "100" }],
    [{ text: "Cancelar" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

const passwordKeyboard = {
  remove_keyboard: true,
};

Deno.serve(async (req) => {
  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tgFetch = async (method: string, body: any) => {
    if (!TG) return null;
    // Reintentos con backoff (max 3) para resistir latencia
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (r.ok) return j;
        if (r.status >= 500) { await new Promise(res => setTimeout(res, 300 * (i + 1))); continue; }
        return j;
      } catch (e) {
        console.error("tgFetch retry", i, method, e);
        await new Promise(res => setTimeout(res, 300 * (i + 1)));
      }
    }
    return null;
  };

  const isSuper = (id: string | number) => String(id) === SUPER_ADMIN;
  const isAdmin = async (id: string | number): Promise<boolean> => {
    const sid = String(id);
    if (sid === SUPER_ADMIN) return true;
    const { data } = await supabase.from("telegram_admins").select("telegram_id").eq("telegram_id", Number(sid)).maybeSingle();
    return !!data;
  };
  const log = async (adminId: string | number, action: string, target?: string, details?: any) => {
    try {
      await supabase.from("admin_action_logs").insert({
        admin_id: String(adminId), action, target: target || null, details: details || null,
      });
    } catch (e) { console.error("log", e); }
  };

  const deleteProof = async (proofUrl?: string | null) => {
    if (!proofUrl) return;
    try {
      const marker = "/payment-proofs/";
      const idx = proofUrl.indexOf(marker);
      if (idx === -1) return;
      const path = decodeURIComponent(proofUrl.slice(idx + marker.length).split("?")[0]);
      if (!path) return;
      await supabase.storage.from("payment-proofs").remove([path]);
    } catch (e) { console.error("deleteProof", e); }
  };

  // ==== Generación de keys usada por Telegram — MISMA LÓGICA que /admin ====
  const backendGenerateKeys = async (count: number, keyType: "Normal" | "Premium", duration: string) => {
    const rows: any[] = [];
    const generated: string[] = [];
    const durationMs = DURATION_MS[duration] || 0;
    const now = new Date().toISOString();
    for (let i = 0; i < count; i++) {
      const k = genKey();
      generated.push(k);
      rows.push({
        key: k,
        type: keyType,
        status: "Activa",
        duration,
        duration_ms: durationMs,
        created_at: now,
      });
    }
    const { error } = await supabase.from("proxy_keys").insert(rows);
    if (error) throw new Error(error.message);
    return generated;
  };

  const approvePayment = async (id: string, adminId: string | number, chatIdForMsg?: number, messageId?: number) => {
    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, msg: "No encontrado" };
    if (row.status !== "pending") return { ok: false, msg: `Ya estaba ${row.status}` };

    const [newK] = await backendGenerateKeys(1, (row.key_type || "Normal") as any, row.duration);
    // Adjuntar metadata del pago a la key
    await supabase.from("proxy_keys").update({
      device_fingerprint: row.device_fingerprint,
      email: row.email,
      payment_request_id: row.id,
    }).eq("key", newK);

    await supabase.from("payment_requests").update({
      status: "approved",
      delivered_key: newK,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      proof_url: null,
    }).eq("id", id);

    await deleteProof(row.proof_url);
    await log(adminId, "approve", id, { key: newK });

    const caption = `APROBADO\n\nUsuario: ${row.user_name}\nEmail: ${row.email || "(none)"}\nPlan: ${row.plan_label}\nKey: ${newK}\nDuración: ${row.duration}`;
    if (chatIdForMsg && messageId) {
      await tgFetch("editMessageCaption", { chat_id: chatIdForMsg, message_id: messageId, caption });
    }
    return { ok: true, key: newK, msg: caption };
  };

  const rejectPayment = async (id: string, adminId: string | number, chatIdForMsg?: number, messageId?: number) => {
    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).maybeSingle();
    if (!row) return { ok: false, msg: "No encontrado" };
    if (row.status !== "pending") return { ok: false, msg: `Ya estaba ${row.status}` };
    await supabase.from("payment_requests").update({
      status: "rejected", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString(), proof_url: null,
    }).eq("id", id);
    await deleteProof(row.proof_url);
    await log(adminId, "reject", id);
    const cap = `RECHAZADO\n\nUsuario: ${row.user_name}\nPlan: ${row.plan_label}`;
    if (chatIdForMsg && messageId) {
      await tgFetch("editMessageCaption", { chat_id: chatIdForMsg, message_id: messageId, caption: cap });
    }
    return { ok: true, msg: cap };
  };

  try {
    const update = await req.json();

    // ================= MENSAJES =================
    if (update?.message?.text) {
      const text: string = update.message.text.trim();
      const chatId = update.message.chat.id as number;
      const fromId = update.message.from?.id;

      const reply = (t: string, keyboard: any = mainKeyboard) =>
        tgFetch("sendMessage", { chat_id: chatId, text: t, reply_markup: keyboard });

      // Autorización mínima (ID)
      if (!(await isAdmin(fromId))) {
        await tgFetch("sendMessage", { chat_id: chatId, text: "No autorizado." });
        return new Response("ok");
      }

      let sess = sessions.get(chatId);
      if (!sess) { sess = { authed: false }; sessions.set(chatId, sess); }

      // ---- /start SIEMPRE responde y pide contraseña ----
      if (text === "/start") {
        sess.authed = false;
        sess.step = "await_password";
        await tgFetch("sendMessage", {
          chat_id: chatId,
          text: "Bienvenido a Ryuk Auxiliar Bot\n\nIntroduce la contraseña para continuar:",
          reply_markup: passwordKeyboard,
        });
        return new Response("ok");
      }

      // ---- Verificación de contraseña ----
      if (sess.step === "await_password" || !sess.authed) {
        if (text === BOT_PASSWORD) {
          sess.authed = true;
          sess.step = undefined;
          await reply("Acceso concedido. Menú principal:", mainKeyboard);
        } else {
          await tgFetch("sendMessage", {
            chat_id: chatId,
            text: "Contraseña inválida. Inténtalo de nuevo:",
            reply_markup: passwordKeyboard,
          });
        }
        return new Response("ok");
      }

      // ---- Cancelar / Salir ----
      if (text === "Cancelar") {
        sess.step = undefined; sess.duration = undefined; sess.keyType = undefined;
        await reply("Cancelado.", mainKeyboard);
        return new Response("ok");
      }
      if (text === "Salir" || text === "/logout") {
        sessions.delete(chatId);
        await tgFetch("sendMessage", { chat_id: chatId, text: "Sesión cerrada. Envía /start para volver a entrar.", reply_markup: passwordKeyboard });
        return new Response("ok");
      }

      // ---- Flujo Generar Key ----
      if (text === "Generar Key" || text === "/generar") {
        sess.step = "gen_duration";
        sess.keyType = "Normal";
        await reply("Elige la duración de la key:", durationKeyboard);
        return new Response("ok");
      }
      if (sess.step === "gen_duration") {
        if (DURATION_MS[text] === undefined) {
          await reply("Duración no válida. Elige una opción:", durationKeyboard);
          return new Response("ok");
        }
        sess.duration = text;
        sess.step = "gen_qty";
        await reply(`Duración: ${text}\nAhora elige la cantidad:`, qtyKeyboard);
        return new Response("ok");
      }
      if (sess.step === "gen_qty") {
        const qty = parseInt(text, 10);
        if (!qty || qty < 1 || qty > 500) {
          await reply("Cantidad inválida (1-500):", qtyKeyboard);
          return new Response("ok");
        }
        try {
          const keys = await backendGenerateKeys(qty, sess.keyType || "Normal", sess.duration!);
          await log(fromId, "generarkey", `${qty}`, { duration: sess.duration, keys });
          const preview = keys.slice(0, 25).join("\n");
          const extra = keys.length > 25 ? `\n… (+${keys.length - 25} más)` : "";
          await reply(`✅ Generadas ${keys.length} keys (${sess.duration}) — visibles ahora en /admin:\n\n${preview}${extra}`, mainKeyboard);
        } catch (e: any) {
          await reply("Error al generar: " + (e?.message || "x"), mainKeyboard);
        }
        sess.step = undefined; sess.duration = undefined;
        return new Response("ok");
      }

      // ---- Botones del menú principal ----
      if (text === "Stock" || text === "/stockkeys") {
        const { data } = await supabase.from("proxy_keys").select("duration,status").eq("status", "Activa");
        const counts: Record<string, number> = {};
        (data || []).forEach((k: any) => { counts[k.duration] = (counts[k.duration] || 0) + 1; });
        const lines = Object.entries(counts).map(([d, n]) => `${d}: ${n}`);
        await reply(lines.length ? "STOCK ACTIVAS\n" + lines.join("\n") : "Sin stock activo.");
        return new Response("ok");
      }
      if (text === "Pagos pendientes" || text === "/verpagos") {
        const { data } = await supabase.from("payment_requests").select("id,user_name,plan_label,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(15);
        const lines = (data || []).map((p: any) => `${p.id.slice(0, 8)} · ${p.user_name} · ${p.plan_label}`);
        await reply(lines.length ? "PENDIENTES\n" + lines.join("\n") : "Sin pagos pendientes.");
        return new Response("ok");
      }
      if (text === "Últimos pagos" || text === "/ultimospagos") {
        const { data } = await supabase.from("payment_requests").select("id,user_name,plan_label,status,created_at").order("created_at", { ascending: false }).limit(10);
        const lines = (data || []).map((p: any) => `[${p.status}] ${p.id.slice(0, 8)} · ${p.user_name} · ${p.plan_label}`);
        await reply(lines.length ? lines.join("\n") : "Sin pagos.");
        return new Response("ok");
      }
      if (text === "Últimas keys" || text === "/verkeys") {
        const { data } = await supabase.from("proxy_keys").select("key,status,duration,used_by,created_at").order("created_at", { ascending: false }).limit(15);
        const lines = (data || []).map((k: any) => `${k.status[0]} ${k.key} · ${k.duration}${k.used_by ? " → " + k.used_by : ""}`);
        await reply(lines.length ? lines.join("\n") : "Sin keys.");
        return new Response("ok");
      }
      if (text === "Estado" || text === "/verestado") {
        const { count: pendingC } = await supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
        const wh = await tgFetch("getWebhookInfo", {});
        await reply(`Estado del sistema\n\nDB: OK\nPendientes: ${pendingC ?? 0}\nToken TG: ${TG ? "OK" : "FALTA"}\nWebhook: ${wh?.result?.url ? "OK" : "?"}`);
        return new Response("ok");
      }
      if (text === "Estadísticas" || text === "/panelstats") {
        const [{ count: total }, { count: approved }, { count: pending }, { count: rejected }, { count: keysActive }, { count: keysUsed }] = await Promise.all([
          supabase.from("payment_requests").select("*", { count: "exact", head: true }),
          supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "approved"),
          supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "rejected"),
          supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Activa"),
          supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Usada"),
        ]);
        await reply(`Estadísticas\n\nPagos totales: ${total}\n  ✅ Aprobados: ${approved}\n  ⏳ Pendientes: ${pending}\n  ❌ Rechazados: ${rejected}\n\nKeys activas: ${keysActive}\nKeys usadas: ${keysUsed}`);
        return new Response("ok");
      }
      if (text === "Ayuda" || text === "/help") {
        await reply([
          "AYUDA · Ryuk Auxiliar Bot",
          "",
          "Usa la barra inferior para navegar. Todo lo que hagas aquí se guarda en la MISMA base de datos que /admin.",
          "",
          "Comandos rápidos:",
          "/generar · nueva key",
          "/aprobar <id> · aprueba pago",
          "/rechazar <id> · rechaza pago",
          "/reenviarkey <id|email>",
          "/regenerarkey <id>",
          "/verbloqueados",
          "/bloquearusuario <email> [razón]",
          "/desbloquearusuario <email>",
          "/logs",
          "/reiniciarwebhook",
          "/logout · cerrar sesión",
        ].join("\n"));
        return new Response("ok");
      }

      // ---- Comandos de texto avanzados ----
      const parts = text.split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const arg1 = parts[1];
      const restArgs = parts.slice(2).join(" ");

      try {
        if (cmd === "/aprobar" && arg1) { const r = await approvePayment(arg1, fromId); await reply(r.msg); return new Response("ok"); }
        if (cmd === "/rechazar" && arg1) { const r = await rejectPayment(arg1, fromId); await reply(r.msg); return new Response("ok"); }
        if (cmd === "/reenviarkey" && arg1) {
          let q = supabase.from("payment_requests").select("*").eq("status", "approved").not("delivered_key", "is", null).order("resolved_at", { ascending: false }).limit(1);
          q = arg1.includes("@") ? q.eq("email", arg1.toLowerCase()) : q.eq("id", arg1);
          const { data: pr } = await q.maybeSingle();
          if (!pr) { await reply("No se encontró pago aprobado."); return new Response("ok"); }
          await log(fromId, "reenviarkey", arg1);
          await reply(`Reenvío\nUsuario: ${pr.user_name}\nKey: ${pr.delivered_key}\nPlan: ${pr.plan_label}`);
          return new Response("ok");
        }
        if (cmd === "/regenerarkey" && arg1) {
          const { data: pr } = await supabase.from("payment_requests").select("*").eq("id", arg1).maybeSingle();
          if (!pr) { await reply("No encontrado"); return new Response("ok"); }
          if (pr.delivered_key) await supabase.from("proxy_keys").update({ status: "Bloqueada" }).eq("key", pr.delivered_key);
          const [newK] = await backendGenerateKeys(1, (pr.key_type || "Normal") as any, pr.duration);
          await supabase.from("proxy_keys").update({
            device_fingerprint: pr.device_fingerprint, email: pr.email, payment_request_id: pr.id,
          }).eq("key", newK);
          await supabase.from("payment_requests").update({ delivered_key: newK, updated_at: new Date().toISOString() }).eq("id", pr.id);
          await log(fromId, "regenerarkey", arg1, { old: pr.delivered_key, new: newK });
          await reply(`Regenerada\nAnterior bloqueada: ${pr.delivered_key || "(none)"}\nNueva: ${newK}`);
          return new Response("ok");
        }
        if (cmd === "/bloquearusuario" && arg1) {
          const em = arg1.toLowerCase();
          await supabase.from("blocked_users").upsert({ email: em, blocked_by: String(fromId), reason: restArgs || null }, { onConflict: "email" });
          await log(fromId, "bloquearusuario", em, { reason: restArgs });
          await reply(`Bloqueado: ${em}`);
          return new Response("ok");
        }
        if (cmd === "/desbloquearusuario" && arg1) {
          const em = arg1.toLowerCase();
          await supabase.from("blocked_users").delete().eq("email", em);
          await log(fromId, "desbloquearusuario", em);
          await reply(`Desbloqueado: ${em}`);
          return new Response("ok");
        }
        if (cmd === "/verbloqueados") {
          const { data } = await supabase.from("blocked_users").select("email,reason,created_at").order("created_at", { ascending: false }).limit(30);
          const lines = (data || []).map((b: any) => `${b.email}${b.reason ? " · " + b.reason : ""}`);
          await reply(lines.length ? "BLOQUEADOS\n" + lines.join("\n") : "Sin bloqueados.");
          return new Response("ok");
        }
        if (cmd === "/agregaradmin" && isSuper(fromId) && arg1 && !isNaN(Number(arg1))) {
          await supabase.from("telegram_admins").upsert({ telegram_id: Number(arg1), added_by: String(fromId) }, { onConflict: "telegram_id" });
          await log(fromId, "agregaradmin", arg1);
          await reply(`Admin agregado: ${arg1}`);
          return new Response("ok");
        }
        if (cmd === "/eliminaradmin" && isSuper(fromId) && arg1) {
          await supabase.from("telegram_admins").delete().eq("telegram_id", Number(arg1));
          await log(fromId, "eliminaradmin", arg1);
          await reply(`Admin eliminado: ${arg1}`);
          return new Response("ok");
        }
        if (cmd === "/logs") {
          const { data } = await supabase.from("admin_action_logs").select("admin_id,action,target,created_at").order("created_at", { ascending: false }).limit(20);
          const lines = (data || []).map((l: any) => `${new Date(l.created_at).toLocaleTimeString("es-ES")} ${l.admin_id} ${l.action} ${l.target || ""}`);
          await reply(lines.length ? "LOGS\n" + lines.join("\n") : "Sin logs.");
          return new Response("ok");
        }
        if (cmd === "/reiniciarwebhook") {
          const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
          const r = await tgFetch("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
          await log(fromId, "reiniciarwebhook", url);
          await reply(`Webhook actualizado: ${r?.description || "ok"}`);
          return new Response("ok");
        }

        await reply("Comando no reconocido. Usa la barra inferior o /help.");
      } catch (e) {
        console.error("cmd err", e);
        await reply("Error: " + (e instanceof Error ? e.message : "x"));
      }
      return new Response("ok");
    }

    // ================= CALLBACK BUTTONS =================
    const cb = update?.callback_query;
    if (!cb) return new Response("ok");
    const fromId = cb.from?.id;
    if (!(await isAdmin(fromId))) {
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "No autorizado", show_alert: true });
      return new Response("ok");
    }
    const [action, id] = (cb.data || "").split(":");
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
    console.error("outer", e);
    return new Response("ok");
  }
});
