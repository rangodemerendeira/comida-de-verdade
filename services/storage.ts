import AsyncStorage from "@react-native-async-storage/async-storage";

/* ===== KEYS ===== */
const SAVED_RECIPES_KEY = "@saved_recipes";
const HISTORY_KEY = "@search_history";

/* ===== RECEITAS SALVAS ===== */
export async function getSavedRecipes() {
  const data = await AsyncStorage.getItem(SAVED_RECIPES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveRecipe(recipe: any) {
  const current = await getSavedRecipes();
  const updated = [recipe, ...current];
  await AsyncStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(updated));
}

export async function removeRecipe(index: number) {
  const current = await getSavedRecipes();
  current.splice(index, 1);
  await AsyncStorage.setItem(SAVED_RECIPES_KEY, JSON.stringify(current));
}

/* ===== HISTÓRICO ===== */
export async function getHistory() {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addHistory(items: string[]) {
  const current = await getHistory();

  const entry = {
    alimentos: items,
    date: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([entry, ...current])
  );
}
