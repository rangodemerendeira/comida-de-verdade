import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Expo recomenda enviar em lotes (100 é um bom MVP)
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sendExpoBatch(messages: any[]) {
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  return resp.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ✅ segurança simples (header)
  const secret = req.headers["x-push-secret"];
  if (!secret || secret !== process.env.PUSH_ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, body, data } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: "Missing title/body" });

  const { data: rows, error } = await supabase
    .from("push_tokens")
    .select("token")
    .limit(5000);

  if (error) return res.status(500).json({ error: error.message });

  const tokens = (rows || []).map((r: any) => r.token).filter(Boolean);

  const batches = chunk(tokens, 100);
  const results: any[] = [];

  for (const b of batches) {
    const messages = b.map((to: string) => ({
      to,
      title,
      body,
      data: data ?? {},
    }));
    results.push(await sendExpoBatch(messages));
  }

  return res.status(200).json({
    ok: true,
    tokens: tokens.length,
    batches: batches.length,
    results,
  });
}
