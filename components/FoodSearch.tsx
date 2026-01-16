import { useState } from "react";
import {
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";

type Props = {
  foods: string[];
  selected: string[];
  onToggle: (food: string) => void;
};

export default function FoodSearch({ foods, selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const suggestions = query
    ? foods.filter((f) =>
        f.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const showCustomFood =
    query.length > 0 &&
    !selected.includes(query.toLowerCase());

  return (
    <View>
      <TextInput
        placeholder="Digite um alimento"
        value={query}
        onChangeText={setQuery}
        placeholderTextColor={isDark ? "#AAA" : "#666"}
        style={{
          borderWidth: 1,
          borderColor: isDark ? "#555" : "#ccc",
          borderRadius: 10,
          padding: 14,
          marginBottom: 10,
          backgroundColor: isDark ? "#1E1E1E" : "#FFF",
          color: isDark ? "#FFF" : "#000",
        }}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {suggestions.map((food) => {
          const isSelected = selected.includes(food);

          return (
            <TouchableOpacity
              key={food}
              onPress={() => {
                onToggle(food);
                setQuery("");
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: isSelected
                  ? "#2ecc71"
                  : isDark
                  ? "#333"
                  : "#eee",
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? "#FFF"
                    : isDark
                    ? "#EEE"
                    : "#333",
                }}
              >
                {isSelected ? "✓ " : ""}
                {food}
              </Text>
            </TouchableOpacity>
          );
        })}

        {showCustomFood && (
          <TouchableOpacity
            onPress={() => {
              onToggle(query.toLowerCase());
              setQuery("");
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: isDark ? "#333" : "#eee",
            }}
          >
            <Text style={{ color: isDark ? "#EEE" : "#333" }}>
              {query}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
