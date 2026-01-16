import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

type ReceitaResumo = { nome: string; tempo_minutos?: number };

type HistoricoItem = {
  id: string;
  createdAt: number;
  alimentos: string[];
  receitasResumo: ReceitaResumo[];
  // opcional: se existir, a Home reabre sem chamar IA
  receitas?: any[];
};

function formatDate(ts: number) {
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

export default function HistoryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#121212" : "#FAFAFA";
  const cardBg = isDark ? "#1E1E1E" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#0B0B0B";
  const muted = isDark ? "#CFCFCF" : "#555555";
  const divider = isDark ? "#2F2F2F" : "#EEEEEE";
  const outline = isDark ? "#3A3A3A" : "#DDDDDD";

  const [itens, setItens] = useState<HistoricoItem[]>([]);

  const carregar = useCallback(async () => {
    const raw = await AsyncStorage.getItem("historico_buscas");
    const lista: HistoricoItem[] = raw ? JSON.parse(raw) : [];
    setItens(lista);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function limparHistorico() {
    Alert.alert("Limpar histórico", "Quer apagar todo o histórico?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("historico_buscas");
          setItens([]);
        },
      },
    ]);
  }

  async function abrirRegistroNaHome(item: HistoricoItem) {
    // guarda o registro para a Home reabrir as receitas
    await AsyncStorage.setItem("home_restore", JSON.stringify(item));
    router.push("/"); // volta pra Home
  }

  return (
    <ScrollView style={{ backgroundColor: bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: text }]}>🕘 Histórico</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          Toque em um registro para reabrir as receitas na Home
        </Text>

        {itens.length > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: outline }]}
            onPress={limparHistorico}
          >
            <Text style={{ color: text, fontWeight: "700" }}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>

      {itens.length === 0 ? (
        <Text style={{ color: muted }}>
          Ainda não há histórico. Gere algumas receitas na tela inicial 🙂
        </Text>
      ) : (
        itens.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.9}
            onPress={() => abrirRegistroNaHome(item)}
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: divider },
            ]}
          >
            <Text style={[styles.cardTop, { color: muted }]}>
              {formatDate(item.createdAt)}
            </Text>

            <Text style={[styles.cardTitle, { color: text }]}>
              {item.alimentos.join(", ")}
            </Text>

            {item.receitasResumo?.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.smallLabel, { color: muted }]}>
                  Sugestões:
                </Text>
                {item.receitasResumo.slice(0, 3).map((r, idx) => (
                  <Text key={`${item.id}-r-${idx}`} style={{ color: muted }}>
                    • {r.nome}
                    {typeof r.tempo_minutos === "number" ? ` (${r.tempo_minutos} min)` : ""}
                  </Text>
                ))}
              </View>
            )}

            <Text style={{ color: muted, marginTop: 10 }}>
              Toque para reabrir na Home →
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, paddingBottom: 28 },

  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { marginTop: 6 },

  clearBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },

  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },

  cardTop: { fontSize: 12 },
  cardTitle: { marginTop: 6, fontSize: 16, fontWeight: "800" },
  smallLabel: { fontWeight: "700", marginBottom: 6 },
});
