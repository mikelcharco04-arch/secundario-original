import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const update = await req.json();
    const cb = update?.callback_query;
    if (!cb || !TG) return new Response("ok");

    const data: string = cb.data || "";
    const [action, id] = data.split(":");
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;

    const answer = async (text: string) => {
      await fetch(`https://api.telegram.org/bot${TG}/answerCallbackQuery`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: cb.id, text, show_alert: false }),
      });
    };

    const editCaption = async (newCaption: string) => {
      await fetch(`https://api.telegram.org/bot${TG}/editMessageCaption`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, caption: newCaption }),
      });
    };

    const { data: row } = await supabase.from("payment_requests").select("*").eq("id", id).single();
    if (!row) { await answer("No encontrado"); return new Response("ok"); }
    if (row.status !== "pending") { await answer(`Ya estaba ${row.status}`); return new Response("ok"); }

    if (action === "approve") {
      // find available key
      const { data: avail } = await supabase
        .from("proxy_keys")
        .select("*")
        .eq("status", "Activa")
        .eq("type", row.key_type)
        .eq("duration", row.duration)
        .limit(1).maybeSingle();

      let assignedKey = avail?.key;
      if (!assignedKey) {
        // generate one
        const newK = genKey();
        await supabase.from("proxy_keys").insert({
          key: newK,
          type: row.key_type,
          status: "Activa",
          duration: row.duration,
          duration_ms: row.duration_ms,
        });
        assignedKey = newK;
      }

      await supabase.from("payment_requests").update({
        status: "approved",
        delivered_key: assignedKey,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      await editCaption(`APROBADO\n\nUsuario: ${row.user_name}\nPlan: ${row.plan_label}\nKey entregada: ${assignedKey}`);
      await answer("Aprobado y key entregada");
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
