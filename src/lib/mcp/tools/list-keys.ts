import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_keys",
  title: "List proxy keys",
  description: "List proxy keys, optionally filtered by status (Activa, Usada, Expirada, Bloqueada).",
  inputSchema: {
    status: z.enum(["Activa", "Usada", "Expirada", "Bloqueada"]).optional().describe("Filter by status."),
    limit: z.number().int().positive().optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }) => {
    const sb = client();
    let q = sb.from("proxy_keys").select("key,type,status,duration,created_at,used_by,expires_at")
      .order("created_at", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { keys: data },
    };
  },
});
