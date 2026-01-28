import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const { events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: "Envie { events: [...] }" });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Supabase não configurado",
        details: "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel",
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // limpa e normaliza
    const rows = events.map((e) => ({
      event_name: String(e.name || "unknown"),
      ts_ms: Number(e.ts || Date.now()),
      session_id: e.sessionId ? String(e.sessionId) : null,
      user_id: e.userId ? String(e.userId) : null,
      props: e.props ?? null,
      context: e.context ?? null,
    }));

    const { error } = await supabase.from("analytics_events").insert(rows);
    if (error) {
      return res.status(500).json({ error: "Erro ao inserir", details: error.message });
    }

    return res.status(200).json({ ok: true, inserted: rows.length });
  } catch (e) {
    return res.status(500).json({ error: "Erro no analytics", details: String(e?.message || e) });
  }
}
