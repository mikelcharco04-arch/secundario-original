import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function client() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "set_user_blocked",
  title: "Block or unblock user",
  description: "Set the blocked state for an active user identified by their key.",
  inputSchema: {
    key: z.string().min(1).describe("The proxy key of the user."),
    blocked: z.boolean().describe("True to block, false to unblock."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ key, blocked }) => {
    const sb = client();
    const { error } = await sb.from("active_users").update({ blocked }).eq("key", key);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Usuario ${key} ${blocked ? "bloqueado" : "desbloqueado"}.` }] };
  },
});
