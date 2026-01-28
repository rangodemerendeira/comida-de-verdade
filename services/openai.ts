export type ReceitaUI = {
  nome: string;
  tempo_minutos?: number;
  ingredientes?: string[];
  modo_preparo?: string[];
  nutricao?: any;
  icv?: any;
};

export type RespostaReceitasUI = {
  receitas: ReceitaUI[];
  followUpQuestion?: string;
  icv?: number;
};

const API_URL = "https://okau-lilac.vercel.app/api/gerar-receitas";
const TIMEOUT_MS = 20000;

function inferirEstacaoBrasil(): "verão" | "outono" | "inverno" | "primavera" {
  const mes = new Date().getMonth() + 1;
  if (mes === 12 || mes === 1 || mes === 2) return "verão";
  if (mes >= 3 && mes <= 5) return "outono";
  if (mes >= 6 && mes <= 8) return "inverno";
  return "primavera";
}

async function fetchComTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// converte backend novo -> formato antigo da sua UI
function mapRecipeToUI(r: any): ReceitaUI {
  // backend antigo já vem ok
  if (r?.nome) return r as ReceitaUI;

  // backend novo (recipes)
  return {
    nome: String(r?.title || "Receita"),
    tempo_minutos: typeof r?.timeMinutes === "number" ? r.timeMinutes : undefined,
    ingredientes: Array.isArray(r?.ingredients)
      ? r.ingredients.map((x: any) => (x?.name ? String(x.name) : String(x)))
      : [],
    modo_preparo: Array.isArray(r?.steps) ? r.steps.map((s: any) => String(s)) : [],
    nutricao: r?.nutricao,
    icv: r?.icv,
  };
}

export async function gerarReceitas(
  alimentos: string[],
  options?: {
    utensilios?: string[];
    maxMinutes?: number;
    region?: string;
    locale?: string;
  }
): Promise<RespostaReceitasUI> {
  const payload = {
    alimentos,
    contexto: {
      locale: options?.locale ?? "pt-BR",
      region: options?.region ?? null,
      season: inferirEstacaoBrasil(),
      maxMinutes: options?.maxMinutes ?? 30,
      utensils: options?.utensilios ?? [],
    },
  };

  try {
    const response = await fetchComTimeout(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
      TIMEOUT_MS
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Erro na API da Vercel:", response.status, errorBody);
      throw new Error(`Erro do Servidor: ${response.status}`);
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Resposta não-JSON da API:", text);
      throw new Error("Resposta inválida da API (não é JSON)");
    }

    // aceita: { receitas: [...] } (antigo) ou { recipes: [...] } (novo)
    const receitasRaw = Array.isArray(data?.receitas)
      ? data.receitas
      : Array.isArray(data?.recipes)
      ? data.recipes
      : Array.isArray(data)
      ? data
      : [];

    const receitasUI = receitasRaw.map(mapRecipeToUI);

    return {
      receitas: receitasUI,
      followUpQuestion: typeof data?.followUpQuestion === "string" ? data.followUpQuestion : undefined,
      icv: typeof data?.icv === "number" ? data.icv : undefined,
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("A IA demorou demais (timeout). Tente novamente.");
    }
    console.error("Erro de Rede ou Fetch:", error);
    throw error;
  }
}
