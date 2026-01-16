import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

type Receita = {
  nome: string;
  tempo_minutos?: number;
  ingredientes?: string[];
  modo_preparo?: string[];
  nutricao?: any;
  icv?: any;
};

const STORAGE_KEY = "receitas_salvas";

function normalizarReceitas(raw: any): Receita[] {
  if (!Array.isArray(raw)) return [];

  const objs: Receita[] = raw
    .map((item: any) => {
      if (typeof item === "string") {
        return {
          nome: item,
          ingredientes: [],
          modo_preparo: [],
        } as Receita;
      }

      if (item && typeof item === "object" && typeof item.nome === "string") {
        return {
          nome: item.nome,
          tempo_minutos: item.tempo_minutos,
          ingredientes: Array.isArray(item.ingredientes) ? item.ingredientes : [],
          modo_preparo: Array.isArray(item.modo_preparo) ? item.modo_preparo : [],
          nutricao: item.nutricao,
          icv: item.icv,
        } as Receita;
      }

      return null;
    })
    .filter(Boolean) as Receita[];

  // remove duplicadas por nome (mantém a primeira)
  const seen = new Set<string>();
  const uniq: Receita[] = [];
  for (const r of objs) {
    const key = (r.nome || "").trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
  }

  return uniq;
}

export default function SavedScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#121212" : "#FAFAFA";
  const cardBg = isDark ? "#1E1E1E" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#000000";
  const textMuted = isDark ? "#CCCCCC" : "#555555";
  const divider = isDark ? "#333333" : "#EEEEEE";

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [aberta, setAberta] = useState<number | null>(null);

  const receitasMemo = useMemo(() => receitas, [receitas]);

  const carregar = useCallback(async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      setReceitas([]);
      return;
    }

    try {
      const parsed = JSON.parse(data);
      const normalizadas = normalizarReceitas(parsed);

      // regrava limpo (evita duplicação e bagunça)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizadas));
      setReceitas(normalizadas);
    } catch {
      setReceitas([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function removerReceita(nome: string) {
    const novas = receitasMemo.filter(
      (r) => r.nome.trim().toLowerCase() !== nome.trim().toLowerCase()
    );

    setReceitas(novas);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
    setAberta(null);

    // ✅ avisa a Home que mudou
    DeviceEventEmitter.emit("saved_recipes_changed");
  }

  function confirmarRemover(nome: string) {
    Alert.alert("Remover receita?", `Remover "${nome}" das salvas?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => removerReceita(nome),
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 28 }}
    >
      <Text style={[styles.title, { color: text }]}>⭐ Receitas salvas</Text>

      {receitas.length === 0 && (
        <Text style={{ color: textMuted, marginTop: 12 }}>
          Você ainda não salvou nenhuma receita.
        </Text>
      )}

      {receitas.map((receita, index) => {
        const expandida = aberta === index;

        const ingredientes = Array.isArray(receita.ingredientes)
          ? receita.ingredientes
          : [];
        const modo = Array.isArray(receita.modo_preparo) ? receita.modo_preparo : [];

        return (
          <TouchableOpacity
            key={`${receita.nome.trim().toLowerCase()}::${index}`}
            style={[styles.card, { backgroundColor: cardBg }]}
            onPress={() => setAberta(expandida ? null : index)}
            activeOpacity={0.9}
          >
            <Text style={[styles.cardTitle, { color: text }]}>{receita.nome}</Text>

            {expandida && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { color: text }]}>Ingredientes</Text>
                <Text style={{ color: textMuted }}>
                  {ingredientes.length ? ingredientes.join(", ") : "—"}
                </Text>

                <Text style={[styles.label, { color: text, marginTop: 10 }]}>
                  Modo de preparo
                </Text>
                {modo.length ? (
                  modo.map((p: string, i: number) => (
                    <Text key={`${index}-passo-${i}`} style={{ color: textMuted }}>
                      • {p}
                    </Text>
                  ))
                ) : (
                  <Text style={{ color: textMuted }}>—</Text>
                )}

                {receita.nutricao && (
                  <View
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: divider,
                    }}
                  >
                    <Text style={[styles.label, { color: text }]}>
                      Informações nutricionais
                    </Text>

                    <Text style={{ color: textMuted }}>
                      Proteína: {receita.nutricao.macros?.proteina_g ?? "—"} g
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Carboidrato: {receita.nutricao.macros?.carboidrato_g ?? "—"} g
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Gordura: {receita.nutricao.macros?.gordura_g ?? "—"} g
                    </Text>

                    <Text style={{ color: textMuted }}>
                      Fibras: {receita.nutricao.micros?.fibras_g ?? "—"} g
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Ferro: {receita.nutricao.micros?.ferro_mg ?? "—"} mg
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Cálcio: {receita.nutricao.micros?.calcio_mg ?? "—"} mg
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Vitamina A: {receita.nutricao.micros?.vitamina_a_mcg ?? "—"} mcg
                    </Text>
                    <Text style={{ color: textMuted }}>
                      Vitamina C: {receita.nutricao.micros?.vitamina_c_mg ?? "—"} mg
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.removerBotao}
                  onPress={() => confirmarRemover(receita.nome)}
                >
                  <Text style={styles.removerTexto}>Remover dos salvos</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontWeight: "600",
    marginBottom: 4,
  },
  removerBotao: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  removerTexto: {
    color: "#FFF",
    fontWeight: "700",
  },
});
