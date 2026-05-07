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

const ADMIN_CHAT_ID = "8585803145";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userName, planId, proofUrl } = await req.json();
    const plan = PLANS[planId];
    if (!userName || !plan || !proofUrl) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");

    // 1) AI verification (strict)
    let aiVerdict = "unknown";
    let aiNotes = "";
    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Eres un validador estricto de comprobantes de pago de PayPal. Responde SOLO usando la herramienta validate_proof.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: `Valida ESTRICTAMENTE este comprobante. Debe ser un pago de PayPal real (no captura editada), receptor "ModifaxffLopez" o "@ModifaxffLopez" o paypal.me/ModifaxffLopez, monto exacto: ${plan.amount} USD. Si falta cualquier dato o no es PayPal, marca invalid.` },
                  { type: "image_url", image_url: { url: proofUrl } },
                ],
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "validate_proof",
                description: "Valida comprobante PayPal",
                parameters: {
                  type: "object",
                  properties: {
                    is_paypal: { type: "boolean" },
                    receiver_matches: { type: "boolean", description: "Receptor es ModifaxffLopez" },
                    amount_detected: { type: "number" },
                    amount_matches: { type: "boolean", description: `Monto = ${plan.amount} USD` },
                    verdict: { type: "string", enum: ["valid", "invalid"] },
                    reason: { type: "string" },
                  },
                  required: ["is_paypal", "receiver_matches", "amount_matches", "verdict", "reason"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "validate_proof" } },
          }),
        });
        const aiData = await aiResp.json();
        const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          const parsed = JSON.parse(args);
          aiNotes = `PayPal:${parsed.is_paypal} Receptor:${parsed.receiver_matches} Monto:${parsed.amount_detected || "?"} Match:${parsed.amount_matches} - ${parsed.reason}`;
          aiVerdict = (parsed.is_paypal && parsed.receiver_matches && parsed.amount_matches && parsed.verdict === "valid") ? "valid" : "invalid";
        }
      } catch (e) {
        aiNotes = `IA error: ${e instanceof Error ? e.message : "unknown"}`;
        aiVerdict = "error";
      }
    }

    if (aiVerdict === "invalid") {
      return new Response(JSON.stringify({ error: "Comprobante inválido", details: aiNotes }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2) Insert request
    const { data: row, error: insErr } = await supabase.from("payment_requests").insert({
      user_name: userName,
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

    // 3) Send to Telegram
    if (TG) {
      const caption = `Nueva solicitud de compra\n\nUsuario: ${userName}\nID: ${row.id}\nPlan: ${plan.label}\nDuración: ${plan.duration}\nMonto: $${plan.amount} USD\nIA: ${aiVerdict.toUpperCase()}\nNotas IA: ${aiNotes}\nFecha: ${new Date(row.created_at).toLocaleString("es-ES")}`;
      const tgResp = await fetch(`https://api.telegram.org/bot${TG}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          photo: proofUrl,
          caption,
          reply_markup: {
            inline_keyboard: [[
              { text: "Aprobar Pago", callback_data: `approve:${row.id}` },
              { text: "Rechazar Pago", callback_data: `reject:${row.id}` },
            ]],
          },
        }),
      });
      const tgData = await tgResp.json();
      if (tgData?.result?.message_id) {
        await supabase.from("payment_requests").update({ telegram_message_id: tgData.result.message_id }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: row.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
