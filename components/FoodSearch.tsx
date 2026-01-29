import { useEffect, useRef, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import { flushAnalytics, track } from "../services/analytics";

type Props = {
  foods: string[];
  selected: string[];
  onToggle: (food: string) => void;
};

export default function FoodSearch({ foods, selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // evita mandar evento a cada tecla (debounce)
  const debounceRef = useRef<any>(null);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // se for igual ao último que enviamos, não repete
    if (q === lastSentRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      lastSentRef.current = q;

      // analytics: termo buscado
      track("ingredient_search", {
        query: q,
        suggestionsCount: foods.filter((f) => f.toLowerCase().includes(q)).length,
      });
      flushAnalytics();
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, foods]);

  const suggestions = query
    ? foods.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : [];

  const showCustomFood =
    query.length > 0 && !selected.includes(query.toLowerCase());

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
                // analytics: escolheu sugestão
                track("ingredient_search", {
                  query: query.trim().toLowerCase(),
                  action: "pick_suggestion",
                  picked: food.toLowerCase(),
                });
                flushAnalytics();

                onToggle(food);
                setQuery("");
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: isSelected ? "#2ecc71" : isDark ? "#333" : "#eee",
              }}
            >
              <Text style={{ color: isSelected ? "#FFF" : isDark ? "#EEE" : "#333" }}>
                {isSelected ? "✓ " : ""}
                {food}
              </Text>
            </TouchableOpacity>
          );
        })}

        {showCustomFood && (
          <TouchableOpacity
            onPress={() => {
              const custom = query.toLowerCase().trim();

              // analytics: adicionou alimento novo (custom)
              track("ingredient_search", {
                query: custom,
                action: "add_custom_food",
              });
              flushAnalytics();

              onToggle(custom);
              setQuery("");
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: isDark ? "#333" : "#eee",
            }}
          >
            <Text style={{ color: isDark ? "#EEE" : "#333" }}>{query}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
