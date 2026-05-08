import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { label: string; amount: number; duration: string; durationMs: number; type: string }> = {
  day1: { label: "1 Día", amount: 4, duration: "1 día", durationMs: 24 * 60 * 60 * 1000, type: "Normal" },
  day7: { label: "7 Días", amount: 7, duration: "7 días", durationMs: 7 * 24 * 60 * 60 * 1000, type: "Normal" },
  day30: { label: "30 Días", amount: 15, duration: "30 días", durationMs: 30 * 24 * 60 * 60 * 1000, type: "Normal" },
};

const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_ID") || "8585803145";

async function sendTelegramWithRetry(token: string, payload: any, isVideo: boolean): Promise<any> {
  const endpoint = isVideo ? "sendVideo" : "sendPhoto";
  let lastErr: any = null;
  for (let i = 0; i < 3; i++) {
    try {
      const resp = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data?.ok) return data;
      lastErr = data;
      console.error(`Telegram intento ${i + 1} fallo:`, JSON.stringify(data));
    } catch (e) {
      lastErr = e;
      console.error(`Telegram intento ${i + 1} excepcion:`, e);
    }
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  // Fallback to text message
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: payload.chat_id,
        text: `${payload.caption}\n\nComprobante (no se pudo adjuntar): ${payload.photo || payload.video}`,
        reply_markup: payload.reply_markup,
      }),
    });
  } catch (e) {
    console.error("Telegram fallback msg fallo:", e);
  }
  return { ok: false, error: lastErr };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userName, planId, proofUrl, email, deviceFingerprint, isVideo } = await req.json();
    const plan = PLANS[planId];
    if (!userName || !plan || !proofUrl) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // 1) IA ULTRA LIGERA: solo verifica si parece un comprobante
    let aiVerdict = "valid";
    let aiNotes = "skipped";
    if (LOVABLE_API_KEY && !isVideo) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Verifica si una imagen parece ser un comprobante/captura de pago. No verifiques montos, banco, ni receptor. Responde SOLO con la herramienta." },
              { role: "user", content: [
                { type: "text", text: "¿Esta imagen parece un comprobante o captura de un pago/transferencia/transacción? Sé permisivo." },
                { type: "image_url", image_url: { url: proofUrl } },
              ]},
            ],
            tools: [{
              type: "function",
              function: {
                name: "check_proof",
                parameters: {
                  type: "object",
                  properties: {
                    looks_like_payment: { type: "boolean" },
                    reason: { type: "string" },
                  },
                  required: ["looks_like_payment", "reason"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "check_proof" } },
          }),
        });
        const aiData = await aiResp.json();
        const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          const parsed = JSON.parse(args);
          aiNotes = parsed.reason || "";
          aiVerdict = parsed.looks_like_payment ? "valid" : "invalid";
        }
      } catch (e) {
        aiNotes = `IA error (continuando): ${e instanceof Error ? e.message : "x"}`;
        aiVerdict = "valid"; // fail-open: enviar a admin de todos modos
      }
    }

    if (aiVerdict === "invalid") {
      return new Response(JSON.stringify({ error: "Comprobante inválido", details: "El archivo no parece ser un comprobante de pago." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Insert request
    const { data: row, error: insErr } = await supabase.from("payment_requests").insert({
      user_name: userName,
      email: email || null,
      device_fingerprint: deviceFingerprint || null,
      plan_id: planId,
      plan_label: plan.label,
      duration: plan.duration,
      duration_ms: plan.durationMs,
      key_type: plan.type,
      amount: plan.amount,
      proof_url: proofUrl,
      ai_verdict: aiVerdict,
      ai_notes: aiNotes,
      telegram_chat_id: ADMIN_CHAT_ID,
    }).select().single();
    if (insErr || !row) throw new Error(insErr?.message || "insert fail");

    // 3) Telegram envío con reintentos
    let tgOk = false;
    if (TG) {
      const caption = `Nueva solicitud de compra\n\nUsuario: ${userName}\nEmail: ${email || "(no proporcionado)"}\nID Pago: ${row.id}\nPlan: ${plan.label}\nDuración: ${plan.duration}\nMonto: $${plan.amount} USD\nIA: ${aiVerdict.toUpperCase()} - ${aiNotes}\nFecha: ${new Date(row.created_at).toLocaleString("es-ES")}`;
      const payload: any = {
        chat_id: ADMIN_CHAT_ID,
        caption,
        reply_markup: {
          inline_keyboard: [[
            { text: "Aprobar", callback_data: `approve:${row.id}` },
            { text: "Rechazar", callback_data: `reject:${row.id}` },
          ], [
            { text: "Bloquear usuario", callback_data: `block:${row.id}` },
          ]],
        },
      };
      if (isVideo) payload.video = proofUrl; else payload.photo = proofUrl;

      const tgData = await sendTelegramWithRetry(TG, payload, !!isVideo);
      tgOk = !!tgData?.ok;
      if (tgData?.result?.message_id) {
        await supabase.from("payment_requests").update({ telegram_message_id: tgData.result.message_id }).eq("id", row.id);
      }
    } else {
      console.error("TELEGRAM_BOT_TOKEN no configurado");
    }

    return new Response(JSON.stringify({ ok: true, id: row.id, telegram: tgOk }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
