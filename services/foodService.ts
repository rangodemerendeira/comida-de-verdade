import foodsData from "../data/foods.json";
import { FoodItem } from "../types/FoodItem";

let foods: FoodItem[] = foodsData as FoodItem[];

export function searchFoods(query: string): FoodItem[] {
  const q = query.toLowerCase();

  return foods.filter(
    (food) =>
      food.nome.toLowerCase().includes(q) ||
      food.sinonimos.some((s) => s.toLowerCase().includes(q))
  );
}

export function getAllFoods(): FoodItem[] {
  return foods.filter((f) => f.status === "ativo");
}

export function addFood(nome: string): FoodItem {
  const novo: FoodItem = {
    id: nome.toLowerCase().replace(/\s+/g, "-"),
    nome,
    sinonimos: [],
    criado_por_usuario: true,

    categoria: null,
    subcategoria: null,

    estado_padrao: "cru",
    estados_possiveis: ["cru"],

    nova: null,
    tags: [],

    status: "ativo",
    uso_count: 0,
  };

  foods.push(novo);
  return novo;
}
