export type FoodItem = {
  id: string;
  nome: string;
  sinonimos: string[];

  criado_por_usuario: boolean;

  categoria: string | null;
  subcategoria: string | null;

  estado_padrao: string | null;
  estados_possiveis: string[];

  nova: number | null;
  tags: string[];

  status: "ativo" | "inativo";
  uso_count: number;
};
