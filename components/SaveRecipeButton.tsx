import { Alert, Text, TouchableOpacity } from "react-native";
import { saveRecipe } from "../services/storage";

export default function SaveRecipeButton({ recipe }: { recipe: any }) {
  async function handleSave() {
    await saveRecipe({
      ...recipe,
      savedAt: new Date().toISOString(),
    });

    Alert.alert("Receita salva ❤️");
  }

  return (
    <TouchableOpacity
      onPress={handleSave}
      style={{
        marginTop: 10,
        padding: 10,
        backgroundColor: "#2E7D32",
        borderRadius: 8,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: "#FFF", fontWeight: "600" }}>
        💾 Salvar receita
      </Text>
    </TouchableOpacity>
  );
}
