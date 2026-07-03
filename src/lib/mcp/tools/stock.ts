import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_stock",
  title: "Get key stock",
  description: "Return counts of available (Activa) proxy keys grouped by type and duration.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const sb = client();
    const { data, error } = await sb.from("proxy_keys").select("type,duration").eq("status", "Activa");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const k = `${r.type} — ${r.duration}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const lines = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join("\n") || "Sin stock disponible.";
    return {
      content: [{ type: "text", text: lines }],
      structuredContent: { total: data?.length ?? 0, breakdown: counts },
    };
  },
});
