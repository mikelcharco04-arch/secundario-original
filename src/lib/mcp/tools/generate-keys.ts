import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function generateKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `PROXY-${seg()}-${seg()}`;
}

const DURATIONS: Record<string, number> = {
  "1 minuto": 60_000,
  "1 día": 86_400_000,
  "7 días": 7 * 86_400_000,
  "30 días": 30 * 86_400_000,
};

export default defineTool({
  name: "generate_keys",
  title: "Generate proxy keys",
  description: "Generate one or more proxy keys with a given type and duration. Uses same schema as the admin panel.",
  inputSchema: {
    count: z.number().int().min(1).max(50).describe("Number of keys to generate (1-50)."),
    type: z.enum(["Normal", "Premium"]).describe("Key type."),
    duration: z.enum(["1 minuto", "1 día", "7 días", "30 días"]).describe("Key duration."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ count, type, duration }) => {
    const sb = client();
    const rows = Array.from({ length: count }, () => ({
      key: generateKey(),
      type,
      status: "Activa",
      duration,
      duration_ms: DURATIONS[duration],
      created_at: new Date().toISOString(),
    }));
    const { data, error } = await sb.from("proxy_keys").insert(rows).select("key,type,status,duration");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Generadas ${data?.length ?? 0} keys:\n${data?.map((k) => k.key).join("\n")}` }],
      structuredContent: { keys: data },
    };
  },
});
