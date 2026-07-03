import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_active_users",
  title: "List active users",
  description: "List currently active/logged-in users of the proxy.",
  inputSchema: {
    limit: z.number().int().positive().optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const sb = client();
    const { data, error } = await sb.from("active_users").select("name,key,type,login_at,expires_at,blocked")
      .order("login_at", { ascending: false }).limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { users: data },
    };
  },
});
