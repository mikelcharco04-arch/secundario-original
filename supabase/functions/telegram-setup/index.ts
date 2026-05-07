Deno.serve(async () => {
  const TG = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TG) return new Response(JSON.stringify({ error: "no token" }), { status: 500 });
  const me = await fetch(`https://api.telegram.org/bot${TG}/getMe`).then(r => r.json());
  const set = await fetch(`https://api.telegram.org/bot${TG}/setWebhook`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://wmvyfiizwrrubtjmdznn.supabase.co/functions/v1/telegram-webhook",
      allowed_updates: ["callback_query"],
    }),
  }).then(r => r.json());
  return new Response(JSON.stringify({ me, set }, null, 2), { headers: { "Content-Type": "application/json" } });
});
