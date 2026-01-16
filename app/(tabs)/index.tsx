// app/(tabs)/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";


import FoodSearch from "../../components/FoodSearch";
import { gerarReceitas } from "../../services/openai";

/* ================= CUSTO MÉDIO (MVP) ================= */
const CUSTO_MEDIO: Record<string, number> = {
  arroz: 1.5,
  feijão: 1.8,
  ovo: 1.2,
  frango: 4.5,
  "carne moída": 5.5,
  batata: 1.0,
  cenoura: 0.8,
  cebola: 0.6,
  alho: 0.4,
  tomate: 1.2,
  abobrinha: 1.3,
  banana: 0.7,
  mandioca: 1.6,
  abóbora: 1.4,
};

type Receita = {
  nome: string;
  tempo_minutos?: number;
  ingredientes?: string[];
  modo_preparo?: string[];
  nutricao?: {
    macros?: {
      proteina_g?: number;
      carboidrato_g?: number;
      gordura_g?: number;
    };
    micros?: {
      fibras_g?: number;
      ferro_mg?: number;
      calcio_mg?: number;
      vitamina_a_mcg?: number;
      vitamina_c_mg?: number;
    };
  };
  icv?: number | { score?: number; label?: string };
};

type HistoricoItem = {
  id: string;
  createdAt: number;
  alimentos: string[];
  receitasResumo: { nome: string; tempo_minutos?: number }[];
};

const SAVED_KEY = "receitas_salvas";
const HISTORY_KEY = "historico_buscas";
const RESTORE_KEY = "history_restore";

/* =============== helpers =============== */
function safeArray<T>(x: any): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}

function scoreFromICV(icv: Receita["icv"]): number | null {
  if (typeof icv === "number") return icv;
  if (icv && typeof icv === "object" && typeof (icv as any).score === "number")
    return (icv as any).score;
  return null;
}

function icvLabel(score: number) {
  if (score >= 80) return "🟢 Comida de Verdade";
  if (score >= 50) return "🟡 Algum processamento";
  return "🔴 Evite no dia a dia";
}

function normalizarSaved(raw: any): Receita[] {
  if (!Array.isArray(raw)) return [];

  // aceita legado: string[] (só nome)
  const objs: Receita[] = raw
    .map((item: any) => {
      if (typeof item === "string") return { nome: item } as Receita;
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

  // uniq por nome
  const seen = new Set<string>();
  const uniq: Receita[] = [];
  for (const r of objs) {
    const k = (r.nome || "").trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(r);
  }
  return uniq;
}

function nomesFromSaved(saved: Receita[]): string[] {
  return saved
    .map((r) => (r?.nome ? String(r.nome) : ""))
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const colors = useMemo(() => {
    return {
      bg: isDark ? "#121212" : "#FAFAFA",
      cardBg: isDark ? "#1E1E1E" : "#FFFFFF",
      text: isDark ? "#FFFFFF" : "#0B0B0B",
      muted: isDark ? "#CFCFCF" : "#555555",
      divider: isDark ? "#2F2F2F" : "#EEEEEE",
      chipBg: isDark ? "#2A2A2A" : "#EEEEEE",
      chipText: isDark ? "#EAEAEA" : "#333333",
      chipActiveBg: "#2E7D32",
      chipActiveText: "#FFFFFF",
      primary: "#2E7D32",
      altPrimary: "#1565C0",
      badgeBg: isDark ? "#243124" : "#F1F8E9",
      badgeText: isDark ? "#CDE7CD" : "#33691E",
      outline: isDark ? "#3A3A3A" : "#DDDDDD",
      outlineText: isDark ? "#FFFFFF" : "#0B0B0B",
      dangerBg: "#D32F2F",
    };
  }, [isDark]);

  const [alimentosDisponiveis, setAlimentosDisponiveis] = useState<string[]>([
    "cenoura",
    "batata",
    "alho",
    "cebola",
    "arroz",
    "feijão",
    "ovo",
    "frango",
    "tomate",
    "abobrinha",
    "banana",
    "mandioca",
    "abóbora",
    "carne moída",
  ]);

  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(false);
  const [receitaAberta, setReceitaAberta] = useState<number | null>(null);

  // ✅ agora "salvas" é lista de receitas completas, e "salvasNomes" serve pra UI do botão
  const [salvasReceitas, setSalvasReceitas] = useState<Receita[]>([]);
  const salvasNomes = useMemo(() => nomesFromSaved(salvasReceitas), [salvasReceitas]);

  const [foodSearchKey, setFoodSearchKey] = useState(0);

  /* ========== carregar salvos + ouvir alterações ========== */
  async function carregarSalvos() {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalizadas = normalizarSaved(parsed);

    // regrava normalizado pra limpar legado
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(normalizadas));
    setSalvasReceitas(normalizadas);
  }

  useEffect(() => {
    carregarSalvos();

    // ✅ substitui AsyncStorage.addListener (que não existe)
    const sub = DeviceEventEmitter.addListener("saved_recipes_changed", () => {
      carregarSalvos();
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========== toggle alimentos (inclui novos da busca) ========== */
  function toggleAlimento(alimento: string) {
    const normalizado = alimento.toLowerCase().trim();

    setSelecionados((prev) =>
      prev.includes(normalizado)
        ? prev.filter((a) => a !== normalizado)
        : [...prev, normalizado]
    );

    setAlimentosDisponiveis((prev) =>
      prev.includes(normalizado) ? prev : [...prev, normalizado]
    );
  }

  /* ========== custo ========== */
  function custoEstimado(ingredientes: string[]) {
    let total = 0;

    ingredientes.forEach((ing) => {
      const lower = ing.toLowerCase();
      const chave = Object.keys(CUSTO_MEDIO).find((k) => lower.includes(k));
      total += chave ? CUSTO_MEDIO[chave] : 1;
    });

    return total.toFixed(2);
  }

  /* ========== histórico ========== */
  async function salvarHistorico(alimentos: string[], receitasGeradas: Receita[]) {
    const item: HistoricoItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      alimentos,
      receitasResumo: (receitasGeradas || []).slice(0, 10).map((r) => ({
        nome: r.nome,
        tempo_minutos: r.tempo_minutos,
      })),
    };

    const atual = await AsyncStorage.getItem(HISTORY_KEY);
    const lista: HistoricoItem[] = atual ? JSON.parse(atual) : [];
    const novaLista = [item, ...lista].slice(0, 80);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(novaLista));
  }

  /* ========== gerar receitas ========== */
  async function gerarReceitasUI() {
    if (selecionados.length === 0) {
      Alert.alert("Selecione ao menos um alimento");
      return;
    }

    try {
      setLoading(true);
      setReceitas([]);
      setReceitaAberta(null);

      const data = await gerarReceitas(selecionados);
      const lista: Receita[] = data?.receitas || [];

      setReceitas(lista);
      await salvarHistorico([...selecionados], lista);
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Não foi possível gerar receitas");
    } finally {
      setLoading(false);
    }
  }

  /* ========== limpar tela ========== */
  function limparTela() {
    if (selecionados.length === 0 && receitas.length === 0) return;

    Alert.alert("Limpar", "Quer limpar a tela? (seleção e receitas)", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: () => {
          setSelecionados([]);
          setReceitas([]);
          setReceitaAberta(null);
          setFoodSearchKey((k) => k + 1);
        },
      },
    ]);
  }

  /* ========== compartilhar ========== */
  function formatarReceitaParaCompartilhar(r: Receita) {
    const ings = safeArray<string>(r.ingredientes);
    const passos = safeArray<string>(r.modo_preparo);
    const icv = scoreFromICV(r.icv);
    const custo = ings.length ? custoEstimado(ings) : null;

    const linhas: string[] = [];
    linhas.push(`🍳 ${r.nome}`);
    if (typeof r.tempo_minutos === "number") linhas.push(`⏱ ${r.tempo_minutos} min`);
    if (typeof icv === "number") linhas.push(`${icvLabel(icv)} ${icv}/100`);
    if (custo) linhas.push(`💰 R$ ${custo}`);
    linhas.push("");

    if (ings.length) {
      linhas.push("Ingredientes:");
      linhas.push(ings.map((x) => `• ${x}`).join("\n"));
      linhas.push("");
    }
    if (passos.length) {
      linhas.push("Modo de preparo:");
      linhas.push(passos.map((x, i) => `${i + 1}. ${x}`).join("\n"));
      linhas.push("");
    }

    linhas.push("Feito no app okau - comida de casa");
    return linhas.join("\n");
  }

  async function compartilharReceita(r: Receita) {
    try {
      await Share.share({ message: formatarReceitaParaCompartilhar(r) });
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Não foi possível compartilhar");
    }
  }

  /* ========== salvar/remover receita (completa) ========== */
  async function salvarReceitaCompleta(r: Receita) {
    const nomeKey = (r?.nome || "").trim().toLowerCase();
    if (!nomeKey) return;

    const atual = salvasReceitas;
    const existe = atual.some((x) => (x.nome || "").trim().toLowerCase() === nomeKey);
    if (existe) return;

    // garante arrays (evita salvar "undefined")
    const receitaSafe: Receita = {
      ...r,
      nome: r.nome,
      tempo_minutos: typeof r.tempo_minutos === "number" ? r.tempo_minutos : undefined,
      ingredientes: safeArray<string>(r.ingredientes),
      modo_preparo: safeArray<string>(r.modo_preparo),
      nutricao: r.nutricao ?? undefined,
      icv: r.icv ?? undefined,
    };

    const novas = [receitaSafe, ...atual];
    setSalvasReceitas(novas);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(novas));

    // ✅ avisa outras telas
    DeviceEventEmitter.emit("saved_recipes_changed");
  }

  async function removerReceitaSalva(nome: string) {
    const key = (nome || "").trim().toLowerCase();
    const novas = salvasReceitas.filter(
      (x) => (x.nome || "").trim().toLowerCase() !== key
    );

    setSalvasReceitas(novas);
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(novas));

    // ✅ avisa outras telas
    DeviceEventEmitter.emit("saved_recipes_changed");
  }

  function confirmarRemover(nome: string) {
    Alert.alert("Remover receita?", `Remover "${nome}" das salvas?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removerReceitaSalva(nome) },
    ]);
  }

  /* ========== restaurar do histórico (se existir) ========== */
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(RESTORE_KEY);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        const alimentos: string[] = Array.isArray(parsed?.alimentos) ? parsed.alimentos : [];
        if (alimentos.length) {
          // adiciona na lista de cards também
          setAlimentosDisponiveis((prev) => {
            const set = new Set(prev.map((x) => x.toLowerCase().trim()));
            const merged = [...prev];
            for (const a of alimentos) {
              const n = String(a).toLowerCase().trim();
              if (n && !set.has(n)) {
                set.add(n);
                merged.push(n);
              }
            }
            return merged;
          });
          setSelecionados(alimentos.map((a) => String(a).toLowerCase().trim()).filter(Boolean));
          setReceitas([]);
          setReceitaAberta(null);
          setFoodSearchKey((k) => k + 1);
        }
      } catch {
        // ignore
      } finally {
        await AsyncStorage.removeItem(RESTORE_KEY);
      }
    })();
  }, []);

  /* ========== botão texto/cor ========== */
  const hasReceitas = receitas.length > 0;
  const botaoTexto = loading ? "" : hasReceitas ? "Gerar outras ideias" : "Gerar receitas";
  const botaoCor = hasReceitas ? colors.altPrimary : colors.primary;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingTop: 56, paddingBottom: 28 }}
    >
      {/* HEADER */} <View style={styles.header}> <Text style={[styles.title, { color: colors.text }]}>okau</Text> <Text style={[styles.subtitle, { color: colors.muted }]}> Mais rápido que delivery. Mais barato. Mais saudável. </Text> </View>
      {/* SEÇÃO */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        O que você tem em casa?
      </Text>

      {/* BUSCA */}
      <FoodSearch
        key={`foodsearch-${foodSearchKey}`}
        foods={alimentosDisponiveis}
        selected={selecionados}
        onToggle={toggleAlimento}
      />

      {/* CHIPS */}
      <View style={styles.chipsContainer}>
        {alimentosDisponiveis.map((alimento) => {
          const n = alimento.toLowerCase().trim();
          const ativo = selecionados.includes(n);
          return (
            <TouchableOpacity
              key={`chip-${alimento}`}
              onPress={() => toggleAlimento(alimento)}
              style={[
                styles.chip,
                { backgroundColor: colors.chipBg },
                ativo && { backgroundColor: colors.chipActiveBg },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: colors.chipText },
                  ativo && { color: colors.chipActiveText, fontWeight: "700" },
                ]}
              >
                {alimento}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* BOTÕES */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[
            styles.botaoPrincipal,
            { backgroundColor: botaoCor, opacity: loading ? 0.8 : 1 },
          ]}
          onPress={gerarReceitasUI}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.botaoTexto}>{botaoTexto}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botaoOutline,
            { borderColor: colors.outline, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={limparTela}
          disabled={loading}
        >
          <Text style={[styles.botaoOutlineTexto, { color: colors.outlineText }]}>
            Limpar
          </Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={[styles.dialogo, { borderColor: colors.divider }]}>
          <Text style={[styles.dialogoTexto, { color: colors.muted }]}>
            🤔 Pensando em receitas criativas com os ingredientes escolhidos…
          </Text>
        </View>
      )}

      {/* RECEITAS */}
      {receitas.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sugestões para hoje
          </Text>

          {receitas.map((receita, index) => {
            const aberta = receitaAberta === index;

            const ingredientes = safeArray<string>(receita.ingredientes);
            const passos = safeArray<string>(receita.modo_preparo);

            const custo = ingredientes.length ? custoEstimado(ingredientes) : null;
            const icv = scoreFromICV(receita.icv);

            const nomeKey = (receita.nome || "").trim().toLowerCase();
            const jaSalva = !!nomeKey && salvasNomes.includes(nomeKey);

            return (
              <TouchableOpacity
                key={`rec-${receita.nome}-${index}`}
                style={[
                  styles.card,
                  { backgroundColor: colors.cardBg, borderColor: colors.divider },
                ]}
                onPress={() => setReceitaAberta(aberta ? null : index)}
                activeOpacity={0.9}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {receita.nome}
                </Text>

                <View style={styles.badges}>
                  {typeof icv === "number" && (
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: colors.badgeBg, color: colors.badgeText },
                      ]}
                    >
                      {icvLabel(icv)} {icv}/100
                    </Text>
                  )}

                  {typeof receita.tempo_minutos === "number" && (
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: colors.badgeBg, color: colors.badgeText },
                      ]}
                    >
                      ⏱ {receita.tempo_minutos} min
                    </Text>
                  )}

                  {custo && (
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: colors.badgeBg, color: colors.badgeText },
                      ]}
                    >
                      💰 R$ {custo}
                    </Text>
                  )}
                </View>

                {aberta && (
                  <View style={{ marginTop: 12 }}>
                    {!!ingredientes.length && (
                      <>
                        <Text style={[styles.cardLabel, { color: colors.text }]}>
                          Ingredientes
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          {ingredientes.join(", ")}
                        </Text>
                      </>
                    )}

                    {!!passos.length && (
                      <>
                        <Text style={[styles.cardLabel, { color: colors.text }]}>
                          Modo de preparo
                        </Text>
                        {passos.map((p, i) => (
                          <Text
                            key={`passo-${index}-${i}`}
                            style={[styles.cardText, { color: colors.muted }]}
                          >
                            • {p}
                          </Text>
                        ))}
                      </>
                    )}

                    {receita.nutricao && (
                      <View
                        style={[
                          styles.nutriBox,
                          { borderTopColor: colors.divider },
                        ]}
                      >
                        <Text style={[styles.cardLabel, { color: colors.text }]}>
                          Informações nutricionais
                        </Text>

                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Proteína: {receita.nutricao?.macros?.proteina_g ?? "—"} g
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Carboidrato: {receita.nutricao?.macros?.carboidrato_g ?? "—"} g
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Gordura: {receita.nutricao?.macros?.gordura_g ?? "—"} g
                        </Text>

                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Fibras: {receita.nutricao?.micros?.fibras_g ?? "—"} g
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Ferro: {receita.nutricao?.micros?.ferro_mg ?? "—"} mg
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Cálcio: {receita.nutricao?.micros?.calcio_mg ?? "—"} mg
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Vitamina A: {receita.nutricao?.micros?.vitamina_a_mcg ?? "—"} mcg
                        </Text>
                        <Text style={[styles.cardText, { color: colors.muted }]}>
                          Vitamina C: {receita.nutricao?.micros?.vitamina_c_mg ?? "—"} mg
                        </Text>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      {!jaSalva ? (
                        <TouchableOpacity
                          style={[
                            styles.salvarBotao,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={() => salvarReceitaCompleta(receita)}
                        >
                          <Text style={styles.salvarTexto}>Salvar receita</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.salvarBotao,
                            { backgroundColor: colors.dangerBg },
                          ]}
                          onPress={() => confirmarRemover(receita.nome)}
                        >
                          <Text style={styles.salvarTexto}>Remover dos salvos</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.shareBotao,
                          { borderColor: colors.outline },
                        ]}
                        onPress={() => compartilharReceita(receita)}
                      >
                        <Text style={[styles.shareTexto, { color: colors.text }]}>
                          📤 Compartilhar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },

   header: { marginBottom: 18 },
  title: { fontSize: 30, fontWeight: "700" },
  subtitle: { marginTop: 6 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 12,
  },

  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipText: { fontSize: 14 },

  buttonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  botaoPrincipal: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  botaoTexto: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  botaoOutline: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  botaoOutlineTexto: { fontSize: 14, fontWeight: "900" },

  dialogo: {
    marginTop: 14,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dialogoTexto: { fontStyle: "italic" },

  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: "900" },

  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
  },

  cardLabel: { fontWeight: "900", marginTop: 10 },
  cardText: { marginTop: 4 },

  nutriBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  salvarBotao: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  salvarTexto: { color: "#FFF", fontWeight: "900" },

  shareBotao: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  shareTexto: { fontWeight: "900" },
});
