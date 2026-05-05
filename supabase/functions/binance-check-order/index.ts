import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha512Hex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

const DURATION_MS: Record<string, number> = {
  "1 día": 24 * 60 * 60 * 1000,
  "7 días": 7 * 24 * 60 * 60 * 1000,
  "30 días": 30 * 24 * 60 * 60 * 1000,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { merchantTradeNo } = await req.json();
    if (!merchantTradeNo) return new Response(JSON.stringify({ error: "merchantTradeNo requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Read existing order
    const { data: order } = await supabase.from("payment_orders").select("*").eq("merchant_trade_no", merchantTradeNo).maybeSingle();
    if (!order) return new Response(JSON.stringify({ error: "Orden no encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (order.status === "paid" && order.assigned_key) {
      return new Response(JSON.stringify({ status: "paid", key: order.assigned_key }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Query Binance
    const apiKey = Deno.env.get("BINANCE_PAY_API_KEY")!;
    const apiSecret = Deno.env.get("BINANCE_PAY_SECRET_KEY")!;
    const bodyStr = JSON.stringify({ merchantTradeNo });
    const timestamp = Date.now().toString();
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    const signature = await hmacSha512Hex(apiSecret, `${timestamp}\n${nonce}\n${bodyStr}\n`);

    const resp = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: bodyStr,
    });

    const json = await resp.json();
    console.log("Binance query:", JSON.stringify(json));

    if (json.status !== "SUCCESS" || !json.data) {
      return new Response(JSON.stringify({ status: order.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const binanceStatus = json.data.status; // INITIAL, PENDING, PAID, CANCELED, ERROR, REFUNDING, REFUNDED, EXPIRED
    if (binanceStatus !== "PAID") {
      return new Response(JSON.stringify({ status: binanceStatus.toLowerCase() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate amount
    const paidAmount = Number(json.data.orderAmount);
    if (paidAmount < Number(order.amount)) {
      return new Response(JSON.stringify({ error: "Monto incorrecto" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate key
    const key = generateKey();
    const durationMs = DURATION_MS[order.duration] || 0;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();

    await supabase.from("proxy_keys").insert({
      key,
      type: order.key_type,
      status: "Activa",
      duration: order.duration,
      duration_ms: durationMs,
      created_at: now.toISOString(),
    });

    await supabase.from("payment_orders").update({
      status: "paid",
      assigned_key: key,
      paid_at: now.toISOString(),
      binance_order_id: json.data.transactionId || null,
      raw_webhook: json.data,
    }).eq("merchant_trade_no", merchantTradeNo);

    return new Response(JSON.stringify({ status: "paid", key, expiresAt }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
