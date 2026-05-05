import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { label: string; type: "Normal" | "Premium"; duration: string; amount: number }> = {
  "day1": { label: "1 día", type: "Normal", duration: "1 día", amount: 1 },
  "day7": { label: "7 días", type: "Normal", duration: "7 días", amount: 5 },
  "day30": { label: "30 días", type: "Normal", duration: "30 días", amount: 15 },
  "premium30": { label: "Premium 30 días", type: "Premium", duration: "30 días", amount: 25 },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { planId, email } = await req.json();
    const plan = PLANS[planId];
    if (!plan) return new Response(JSON.stringify({ error: "Plan inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const apiKey = Deno.env.get("BINANCE_PAY_API_KEY")!;
    const apiSecret = Deno.env.get("BINANCE_PAY_SECRET_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const merchantTradeNo = "MFX" + Date.now() + Math.floor(Math.random() * 100000);

    const body = {
      env: { terminalType: "WEB" },
      merchantTradeNo,
      orderAmount: plan.amount,
      currency: "USDT",
      goods: {
        goodsType: "02",
        goodsCategory: "Z000",
        referenceGoodsId: planId,
        goodsName: `Proxy Key ${plan.label}`,
        goodsDetail: `Proxy Key ${plan.label}`,
      },
    };

    const bodyStr = JSON.stringify(body);
    const timestamp = Date.now().toString();
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    const payload = `${timestamp}\n${nonce}\n${bodyStr}\n`;
    const signature = await hmacSha512Hex(apiSecret, payload);

    const resp = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v3/order", {
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
    console.log("Binance create order:", JSON.stringify(json));

    if (json.status !== "SUCCESS") {
      return new Response(JSON.stringify({ error: json.errorMessage || "Error creando orden", details: json }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = json.data;
    await supabase.from("payment_orders").insert({
      merchant_trade_no: merchantTradeNo,
      prepay_id: data.prepayId,
      email: email || null,
      plan_id: planId,
      plan_label: plan.label,
      key_type: plan.type,
      duration: plan.duration,
      amount: plan.amount,
      currency: "USDT",
      status: "pending",
      qr_url: data.qrcodeLink,
      checkout_url: data.checkoutUrl,
      deeplink: data.deeplink,
    });

    return new Response(JSON.stringify({
      merchantTradeNo,
      qrcodeLink: data.qrcodeLink,
      qrContent: data.qrContent,
      checkoutUrl: data.checkoutUrl,
      deeplink: data.deeplink,
      universalUrl: data.universalUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
