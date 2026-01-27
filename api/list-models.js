export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada" });
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
  );
  const data = await r.json();

  if (!r.ok) {
    return res.status(500).json({ error: "Erro ao listar modelos", details: data });
  }

  const models = (data?.models || []).map((m) => ({
    name: m.name, // ex: "models/gemini-2.0-flash"
    supportedActions: m.supportedActions || m.supported_actions || [],
  }));

  const generateContentModels = models.filter((m) =>
    (m.supportedActions || []).includes("generateContent")
  );

  return res.status(200).json({
    count: generateContentModels.length,
    models: generateContentModels,
  });
}
