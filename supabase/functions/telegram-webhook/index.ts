import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPER_ADMIN = Deno.env.get("TELEGRAM_ADMIN_ID") || "8585803145";
const BOT_PASSWORD = "117";

// ============================================================
// Ump & Famosos · Telegram Bot (versión simplificada)
// Solo 3 funciones: Generar Key · Usuarios · Estado
// Fuente única = tablas `proxy_keys` + `active_users` (misma que /admin)
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

const EXTEND_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

type BotSession = { authed: boolean; step?: string | null; duration?: string | null };

const mainKeyboard = {
  keyboard: [
    [{ text: "Generar Key" }, { text: "Usuarios" }],
    [{ text: "Estado" }],
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
};

const qtyKeyboard = {
  keyboard: [
    [{ text: "1" }, { text: "5" }, { text: "10" }],
    [{ text: "25" }, { text: "50" }, { text: "100" }],
    [{ text: "Cancelar" }],
  ],
  resize_keyboard: true,
};

const passwordKeyboard = { remove_keyboard: true };

Deno.serve(async (req) => {
  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tgFetch = async (method: string, body: any) => {
    if (!TG) return null;
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
        console.error("tgFetch", i, method, e);
        await new Promise(res => setTimeout(res, 300 * (i + 1)));
      }
    }
    return null;
  };

  const isAdmin = async (id: string | number): Promise<boolean> => {
    const sid = String(id);
    if (sid === SUPER_ADMIN) return true;
    const { data } = await supabase.from("telegram_admins").select("telegram_id").eq("telegram_id", Number(sid)).maybeSingle();
    return !!data;
  };

  const backendGenerateKeys = async (count: number, duration: string) => {
    const rows: any[] = [];
    const generated: string[] = [];
    const durationMs = DURATION_MS[duration] || 0;
    const now = new Date().toISOString();
    for (let i = 0; i < count; i++) {
      const k = genKey();
      generated.push(k);
      rows.push({ key: k, type: "Normal", status: "Activa", duration, duration_ms: durationMs, created_at: now });
    }
    const { error } = await supabase.from("proxy_keys").insert(rows);
    if (error) throw new Error(error.message);
    return generated;
  };

  const renderUserCard = (u: any) => {
    const exp = u.expires_at ? new Date(u.expires_at) : null;
    const now = Date.now();
    const timeLeft = exp ? Math.max(0, exp.getTime() - now) : 0;
    let leftStr = "—";
    if (exp) {
      const h = Math.floor(timeLeft / 3600000);
      const m = Math.floor((timeLeft % 3600000) / 60000);
      const d = Math.floor(h / 24);
      leftStr = d > 0 ? `${d}d ${h % 24}h` : `${h}h ${m}m`;
    }
    return [
      `👤 ${u.name}`,
      `Key: ${u.key}`,
      `Tipo: ${u.type}`,
      `Estado: ${u.blocked ? "Bloqueado" : "Activo"}`,
      `Tiempo restante: ${leftStr}`,
      `Login: ${new Date(u.login_at).toLocaleString("es-ES")}`,
    ].join("\n");
  };

  const userInlineKeyboard = (key: string, blocked: boolean) => ({
    inline_keyboard: [
      [
        { text: "Sacar", callback_data: `kick:${key}` },
        { text: blocked ? "Desbloquear" : "Bloquear", callback_data: `${blocked ? "unblock" : "block"}:${key}` },
      ],
      [
        { text: "+1h", callback_data: `ext:${key}:1h` },
        { text: "+1d", callback_data: `ext:${key}:1d` },
        { text: "+7d", callback_data: `ext:${key}:7d` },
      ],
    ],
  });

  try {
    const update = await req.json();

    // ================= MENSAJES =================
    if (update?.message?.text) {
      const text: string = update.message.text.trim();
      const chatId = update.message.chat.id as number;
      const fromId = update.message.from?.id;

      const reply = (t: string, keyboard: any = mainKeyboard) =>
        tgFetch("sendMessage", { chat_id: chatId, text: t, reply_markup: keyboard });

      // Acceso abierto: cualquier chat puede autenticarse con la contraseña del bot.

      const loadSession = async (): Promise<BotSession> => {
        const { data } = await supabase.from("telegram_bot_sessions")
          .select("authed,step,duration").eq("chat_id", chatId).maybeSingle();
        return data ? { authed: !!data.authed, step: data.step, duration: data.duration } : { authed: false };
      };
      const saveSession = async (s: BotSession) => {
        await supabase.from("telegram_bot_sessions").upsert({
          chat_id: chatId, authed: s.authed, step: s.step ?? null, duration: s.duration ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "chat_id" });
      };
      const clearSession = async () => {
        await supabase.from("telegram_bot_sessions").delete().eq("chat_id", chatId);
      };

      const sess = await loadSession();

      if (text === "/start") {
        await saveSession({ authed: false, step: "await_password" });
        await tgFetch("sendMessage", {
          chat_id: chatId,
          text: "Bienvenido a Ump & Famosos Bot\n\nIntroduce la contraseña para continuar:",
          reply_markup: passwordKeyboard,
        });
        return new Response("ok");
      }

      if (!sess.authed) {
        if (text === BOT_PASSWORD) {
          await saveSession({ authed: true, step: null });
          await reply("Acceso concedido. Menú principal:", mainKeyboard);
        } else {
          await tgFetch("sendMessage", {
            chat_id: chatId, text: "Contraseña inválida. Inténtalo de nuevo:", reply_markup: passwordKeyboard,
          });
        }
        return new Response("ok");
      }

      if (text === "Cancelar") {
        await saveSession({ authed: true, step: null });
        await reply("Cancelado.", mainKeyboard);
        return new Response("ok");
      }
      if (text === "Salir" || text === "/logout") {
        await clearSession();
        await tgFetch("sendMessage", { chat_id: chatId, text: "Sesión cerrada. Envía /start para volver a entrar.", reply_markup: passwordKeyboard });
        return new Response("ok");
      }

      // ---- Generar Key ----
      if (text === "Generar Key") {
        await saveSession({ authed: true, step: "gen_duration" });
        await reply("Elige la duración de la key:", durationKeyboard);
        return new Response("ok");
      }
      if (sess.step === "gen_duration") {
        if (DURATION_MS[text] === undefined) {
          await reply("Duración no válida. Elige una opción:", durationKeyboard);
          return new Response("ok");
        }
        await saveSession({ authed: true, step: "gen_qty", duration: text });
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
          const keys = await backendGenerateKeys(qty, sess.duration!);
          const preview = keys.slice(0, 25).join("\n");
          const extra = keys.length > 25 ? `\n… (+${keys.length - 25} más)` : "";
          await reply(`Generadas ${keys.length} keys (${sess.duration}) — visibles en /admin:\n\n${preview}${extra}`, mainKeyboard);
        } catch (e: any) {
          await reply("Error al generar: " + (e?.message || "x"), mainKeyboard);
        }
        await saveSession({ authed: true, step: null });
        return new Response("ok");
      }

      // ---- Usuarios ----
      if (text === "Usuarios") {
        const { data } = await supabase.from("active_users").select("name,key,type,login_at,expires_at,blocked")
          .order("login_at", { ascending: false });
        const users = data || [];
        if (!users.length) {
          await reply("No hay usuarios activos ahora mismo.", mainKeyboard);
          return new Response("ok");
        }
        await reply(`Usuarios activos: ${users.length}`, mainKeyboard);
        for (const u of users) {
          await tgFetch("sendMessage", {
            chat_id: chatId,
            text: renderUserCard(u),
            reply_markup: userInlineKeyboard(u.key, !!u.blocked),
          });
        }
        return new Response("ok");
      }

      // ---- Estado ----
      if (text === "Estado") {
        const [{ count: keysActive }, { count: keysUsed }, { count: activeCount }] = await Promise.all([
          supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Activa"),
          supabase.from("proxy_keys").select("*", { count: "exact", head: true }).eq("status", "Usada"),
          supabase.from("active_users").select("*", { count: "exact", head: true }),
        ]);
        const wh = await tgFetch("getWebhookInfo", {});
        await reply([
          "Estado del sistema",
          "",
          `Base de datos: OK`,
          `Token Telegram: ${TG ? "OK" : "FALTA"}`,
          `Webhook: ${wh?.result?.url ? "OK" : "no configurado"}`,
          "",
          `Keys disponibles: ${keysActive ?? 0}`,
          `Keys en uso: ${keysUsed ?? 0}`,
          `Usuarios activos: ${activeCount ?? 0}`,
        ].join("\n"));
        return new Response("ok");
      }

      await reply("Usa la barra inferior para navegar.");
      return new Response("ok");
    }

    // ================= CALLBACK BUTTONS =================
    const cb = update?.callback_query;
    if (!cb) return new Response("ok");
    // Callbacks: sólo válidos si la sesión del chat está autenticada (password 117).
    const cbChatId = cb.message?.chat?.id;
    if (cbChatId) {
      const { data: cbSess } = await supabase.from("telegram_bot_sessions")
        .select("authed").eq("chat_id", cbChatId).maybeSingle();
      if (!cbSess?.authed) {
        await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "Envía /start y la contraseña primero", show_alert: true });
        return new Response("ok");
      }
    }
    const parts = (cb.data || "").split(":");
    const action = parts[0];
    const key = parts[1];
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;

    if (action === "kick" && key) {
      await supabase.from("active_users").delete().eq("key", key);
      await supabase.from("proxy_keys").update({ status: "Expirada", expires_at: new Date().toISOString() }).eq("key", key);
      if (chatId && messageId) {
        await tgFetch("editMessageText", { chat_id: chatId, message_id: messageId, text: `Usuario sacado.\nKey: ${key}` });
      }
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "Usuario sacado" });
      return new Response("ok");
    }

    if ((action === "block" || action === "unblock") && key) {
      const blocked = action === "block";
      await supabase.from("active_users").update({ blocked }).eq("key", key);
      if (blocked) {
        await supabase.from("proxy_keys").update({ status: "Bloqueada" }).eq("key", key);
      } else {
        await supabase.from("proxy_keys").update({ status: "Usada" }).eq("key", key);
      }
      const { data: u } = await supabase.from("active_users").select("name,key,type,login_at,expires_at,blocked").eq("key", key).maybeSingle();
      if (u && chatId && messageId) {
        await tgFetch("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: renderUserCard(u),
          reply_markup: userInlineKeyboard(u.key, !!u.blocked),
        });
      }
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: blocked ? "Bloqueado" : "Desbloqueado" });
      return new Response("ok");
    }

    if (action === "ext" && key && parts[2]) {
      const addMs = EXTEND_MS[parts[2]];
      if (!addMs) {
        await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: "Duración inválida" });
        return new Response("ok");
      }
      const { data: keyRow } = await supabase.from("proxy_keys").select("expires_at").eq("key", key).maybeSingle();
      const base = keyRow?.expires_at ? new Date(keyRow.expires_at).getTime() : Date.now();
      const newExp = new Date(Math.max(base, Date.now()) + addMs).toISOString();
      await supabase.from("proxy_keys").update({ expires_at: newExp, status: "Usada" }).eq("key", key);
      await supabase.from("active_users").update({ expires_at: newExp }).eq("key", key);
      const { data: u } = await supabase.from("active_users").select("name,key,type,login_at,expires_at,blocked").eq("key", key).maybeSingle();
      if (u && chatId && messageId) {
        await tgFetch("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: renderUserCard(u),
          reply_markup: userInlineKeyboard(u.key, !!u.blocked),
        });
      }
      await tgFetch("answerCallbackQuery", { callback_query_id: cb.id, text: `+${parts[2]} añadido` });
      return new Response("ok");
    }

    return new Response("ok");
  } catch (e) {
    console.error("outer", e);
    return new Response("ok");
  }
});
