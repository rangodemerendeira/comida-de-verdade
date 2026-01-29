import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token, platform, userId } = req.body || {};
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Missing token" });

  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        token,
        platform: typeof platform === "string" ? platform : "android",
        user_id: typeof userId === "string" ? userId : null,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "token" }
    );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
