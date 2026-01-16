import AsyncStorage from "@react-native-async-storage/async-storage";

export type HistoryRecipe = {
  nome: string;
  tempo_minutos?: number;
  ingredientes: string[];
  modo_preparo: string[];
  nutricao?: any;
  icv?: any;
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  alimentos: string[];
  receitas: HistoryRecipe[];
};

const KEY = "historico_buscas_v1";

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addHistory(item: Omit<HistoryItem, "id" | "createdAt">) {
  const prev = await getHistory();

  const newItem: HistoryItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    alimentos: item.alimentos,
    receitas: item.receitas,
  };

  const next = [newItem, ...prev].slice(0, 50); // limita 50
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return newItem;
}

export async function removeHistory(id: string) {
  const prev = await getHistory();
  const next = prev.filter((h) => h.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearHistory() {
  await AsyncStorage.removeItem(KEY);
}
