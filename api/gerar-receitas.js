import foodsData from "../data/foods.json";

function searchFoods(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return [];
  return (foodsData || []).filter((food) => {
    const nome = String(food?.nome || "").toLowerCase();
    const sinonimos = Array.isArray(food?.sinonimos) ? food.sinonimos : [];
    return (
      nome.includes(q) ||
      sinonimos.some((s) => String(s || "").toLowerCase().includes(q))
    );
  });
}

function calcularICV(lista) {
  let score = 0;
  const max = Math.max(1, lista.length * 10);

  lista.forEach((nome) => {
    const food = searchFoods(nome)?.[0];

    // fallback: se não achar alimento no banco, assume melhor cenário (in natura)
    const nova = typeof food?.nova === "number" ? food.nova : 1;

    if (nova === 1) score += 10; // in natura
    else if (nova === 2) score += 7; // minimamente
    else if (nova === 3) score -= 10; // processado
    else if (nova === 4) score -= 20; // ultraprocessado
    else score += 5;
  });

  return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
}

function extractJson(text) {
  const t = String(text || "").trim();

  // remove blocos ```json ``` se vierem
  const cleaned = t.replace(/```json|```/g, "").trim();

  // tenta pegar do primeiro { ao último }
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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { alimentos } = req.body || {};

    if (!Array.isArray(alimentos) || alimentos.length === 0) {
      return res.status(400).json({ error: "Envie um array de alimentos" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: "OPENAI_API_KEY não configurada na Vercel" });
    }

    const icvScore = calcularICV(alimentos);

    const PROMPT = `
Você é um chef criativo e nutricionista.

Crie 3 receitas usando SOMENTE os alimentos abaixo.
Todos estão crus. Nada pré-cozido.
Tempo máximo total: 30 minutos (inclui lavar, descascar e cortar).

REGRAS:
- Use exclusivamente os alimentos listados (não adicione leite/óleo/sal/água/açúcar/temperos se não estiverem na lista).
- Receitas executáveis, poucos utensílios, para público brasileiro.
- Evite sugestões incoerentes (ex: ovo em smoothie).
- Tente dar “cara” de receita (panqueca, bolinho, refogado criativo etc) em vez de só misturar.

Alimentos:
${alimentos.join(", ")}

Responda SOMENTE com JSON válido:

{
  "receitas": [
    {
      "nome": string,
      "tempo_minutos": number,
      "ingredientes": string[],
      "modo_preparo": string[],
      "nutricao": {
        "macros": { "proteina_g": number, "carboidrato_g": number, "gordura_g": number },
        "micros": { "fibras_g": number, "ferro_mg": number, "calcio_mg": number, "vitamina_a_mcg": number, "vitamina_c_mg": number }
      }
    }
  ]
}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: PROMPT }],
        temperature: 0.9,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: "Erro na OpenAI",
        details: data?.error?.message || JSON.stringify(data),
      });
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);

    if (!parsed || !Array.isArray(parsed.receitas)) {
      return res.status(500).json({
        error: "Resposta inválida da IA (JSON)",
        details: content?.slice(0, 800),
      });
    }

    const receitas = parsed.receitas.map((r) => ({
      ...r,
      icv: icvScore, // número simples
    }));

    return res.status(200).json({ receitas });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao gerar receitas",
      details: String(e?.message || e),
    });
  }
}
