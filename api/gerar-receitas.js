import fs from "fs";
import path from "path";

/* ================= foods.json ================= */
function loadFoodsData() {
  try {
    const p = path.join(process.cwd(), "data", "foods.json");
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const foodsData = loadFoodsData();

function searchFoods(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  return foodsData.filter((food) => {
    const nome = String(food?.nome || "").toLowerCase();
    const sinonimos = Array.isArray(food?.sinonimos) ? food.sinonimos : [];
    return (
      nome.includes(q) ||
      sinonimos.some((s) => String(s).toLowerCase().includes(q))
    );
  });
}

function calcularICV(lista) {
  let score = 0;
  const max = Math.max(1, lista.length * 10);

  lista.forEach((nome) => {
    const food = searchFoods(nome)?.[0];
    const nova = typeof food?.nova === "number" ? food.nova : 1;

    if (nova === 1) score += 10;
    else if (nova === 2) score += 7;
    else if (nova === 3) score -= 10;
    else if (nova === 4) score -= 20;
    else score += 5;
  });

  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

/* ================= HANDLER ================= */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  try {
    const { alimentos = [], contexto = {} } = req.body || {};

    if (!Array.isArray(alimentos) || alimentos.length === 0) {
      return res.status(400).json({ error: "Envie um array de alimentos" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY não configurada na Vercel",
      });
    }

    const icvScore = calcularICV(alimentos);
    const maxMinutes = contexto.maxMinutes ?? 30;
    const utensils = contexto.utensils ?? [];
    const season = contexto.season ?? "desconhecida";
    const region = contexto.region ?? "Brasil";

    const prompt = `
Você é um chef especializado em pessoas cansadas após o trabalho.

REGRAS:
- Todos os ingredientes estão crus.
- Tempo máximo: ${maxMinutes} minutos.
- Use poucos utensílios.
- Evite prato do dia a dia.
- Não invente ingredientes.
- Considere a cultura do Brasil (${region}) e estação (${season}).

Alimentos disponíveis:
${alimentos.join(", ")}

Responda SOMENTE com JSON válido no formato:

{
  "receitas": [
    {
      "nome": "string",
      "tempo_minutos": number,
      "ingredientes": string[],
      "modo_preparo": string[]
    }
  ]
}
IMPORTANTE: Retorne apenas o objeto JSON em uma única linha, sem formatação de bloco de código.
`.trim();

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000,response_mime_type: "application/json"},
    }),
  }
);




    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro na Gemini",
        details: JSON.stringify(data),
      });
    }

   function extractJsonLoose(text) {
  const t = String(text || "").trim();

  // remove blocos ```json ``` se vierem
  const cleaned = t.replace(/```json|```/g, "").trim();

  // pega do primeiro { ao último }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

const parts = data?.candidates?.[0]?.content?.parts;
const text = Array.isArray(parts)
  ? parts.map((p) => p?.text || "").join("\n")
  : "";

const parsed = extractJsonLoose(text);

if (!parsed) {
  return res.status(500).json({
    error: "Erro ao processar JSON da Gemini",
    preview: String(text || "").slice(0, 800),
    technical: "Não foi possível extrair/parsear JSON válido",
  });
}



    const receitas = Array.isArray(parsed?.receitas)
      ? parsed.receitas.map((r) => ({ ...r, icv: icvScore }))
      : [];

    return res.status(200).json({ receitas, icv: icvScore });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao gerar receitas",
      details: String(e?.message || e),
    });
  }
}
