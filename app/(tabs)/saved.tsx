import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  DeviceEventEmitter,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Receita = {
  nome: string;
  tempo_minutos?: number;
  ingredientes?: string[];
  modo_preparo?: string[];
  nutricao?: any;
  icv?: any;
  favorita?: boolean;

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
          favorita: false,
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
          favorita: !!item.favorita,
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

function SavedHeader({
  colors,
  editMode,
  toggleEditMode,
  selectedCount,
  onDeleteSelected,
  showStarredOnly,
  toggleStarFilter,
}: {
  colors: any;
  editMode: boolean;
  toggleEditMode: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  showStarredOnly: boolean;
  toggleStarFilter: () => void;
}) {
  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }}>
      <View style={[styles.headerWrap, { borderBottomColor: colors.divider }]}>
        {/* Linha 1: Logo central */}
        <View style={styles.headerLogoRow}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 50, height: 50, resizeMode: "contain" }}
          />
        </View>

        <View style={styles.headerSubtitleRow}>
  <Text style={[styles.subtitle, { color: colors.muted, textAlign: "center" }]}>
    Mais rápido que delivery. Mais barato. Mais saudável.
  </Text>
</View>


        {/* Linha 2: "Recentes" esquerda + ações direita */}
        <View style={styles.headerBottomRow}>
          <Text style={[styles.headerRecentes, { color: colors.text }]}>Recentes</Text>

          <View style={styles.headerActions}>
            {/* ⭐ Filtro */}
            <Pressable
              onPress={toggleStarFilter}
              style={[
                styles.headerIconBtn,
                {
                  borderColor: colors.outline,
                  backgroundColor: showStarredOnly ? colors.cardBg : "transparent",
                },
              ]}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.headerStar,
                  { color: showStarredOnly ? "#E1B84A" : colors.outlineText },
                ]}
              >
                ★ Favoritos
              </Text>
            </Pressable>

            {/* 🗑 Excluir selecionadas (só em editMode) */}
            {editMode && (
              <Pressable
                onPress={onDeleteSelected}
                disabled={selectedCount === 0}
                style={[
                  styles.headerDeleteBtn,
                  { opacity: selectedCount === 0 ? 0.5 : 1 },
                ]}
              >
                <Text style={styles.headerDeleteText}>Excluir ({selectedCount})</Text>
              </Pressable>
            )}

            {/* ✏️ Editar/Concluir */}
            <Pressable
              onPress={toggleEditMode}
              style={[
                styles.headerEditBtn,
                { borderColor: colors.outline, backgroundColor: editMode ? colors.cardBg : "transparent" },
              ]}
              hitSlop={10}
            >
              <Text style={{ color: colors.outlineText, fontWeight: "900" }}>
                {editMode ? "Concluir" : "Editar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}


export default function SavedScreen() {
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

  const bg = isDark ? "#121212" : "#FAFAFA";
  const cardBg = isDark ? "#1E1E1E" : "#FFFFFF";
  const text = isDark ? "#FFFFFF" : "#000000";
  const textMuted = isDark ? "#CCCCCC" : "#555555";
  const divider = isDark ? "#333333" : "#EEEEEE";

  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [aberta, setAberta] = useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const [editMode, setEditMode] = useState(false);
function toggleEditMode() {
  setEditMode((v) => {
    const next = !v;
    if (!next) clearSelection();
    return next;
  });
}

const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

function keyFromReceita(r: Receita) {
  return (r.nome || "").trim().toLowerCase(); // chave única (já está normalizado no storage)
}

function toggleSelect(nome: string) {
  const k = (nome || "").trim().toLowerCase();
  setSelectedKeys((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
}

function clearSelection() {
  setSelectedKeys(new Set());
}


  const receitasMemo = useMemo(() => receitas, [receitas]);

  const receitasParaMostrar = useMemo(() => {
  if (!showStarredOnly) return receitasMemo;
  return receitasMemo.filter((r) => !!r.favorita);
}, [receitasMemo, showStarredOnly]);


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

  async function removerSelecionadas() {
  const count = selectedKeys.size;
  if (count === 0) return;

  Alert.alert(
    "Excluir receitas?",
    `Excluir ${count} receita(s) salva(s) de uma vez?`,
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const novas = receitasMemo.filter((r) => {
            const k = keyFromReceita(r);
            return k && !selectedKeys.has(k);
          });

          setReceitas(novas);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
          setAberta(null);
          clearSelection();
          setEditMode(false);

          DeviceEventEmitter.emit("saved_recipes_changed");
        },
      },
    ]
  );
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

async function toggleFavorita(nome: string) {
  const key = (nome || "").trim().toLowerCase();
  if (!key) return;

  const novas = receitasMemo.map((r) => {
    const k = (r.nome || "").trim().toLowerCase();
    if (k !== key) return r;
    return { ...r, favorita: !r.favorita };
  });

  setReceitas(novas);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
  DeviceEventEmitter.emit("saved_recipes_changed");
}


  return (
    <>
    <Stack.Screen
  options={{
    headerShown: true,
    header: () => (
      <SavedHeader
        colors={colors}
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        selectedCount={selectedKeys.size}
        onDeleteSelected={removerSelecionadas}
        showStarredOnly={showStarredOnly}
        toggleStarFilter={() => setShowStarredOnly((v) => !v)}
      />
    ),
  }}
/>


    <ScrollView
    
      style={{ backgroundColor: bg }}
      contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 28 }}
    >
    
 {/*<View style={styles.topRow}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recentes</Text>

  <View style={{ flexDirection: "row", gap: 10 }}>
    <Pressable
      onPress={() => setShowStarredOnly((v) => !v)}
      style={[
        styles.starFilterBtn,
        {
          borderColor: colors.outline,
          backgroundColor: showStarredOnly ? colors.cardBg : "transparent",
        },
      ]}
    >
      <Text
        style={{
          fontWeight: "900",
          fontSize: 14,
          color: showStarredOnly ? "#E1B84A" : colors.outlineText,
        }}
      >
        ★ Salvos
      </Text>
    </Pressable>

         {/* 🗑 Excluir selecionadas (só no modo editar) */}
    {/*{editMode && (
      <Pressable
        onPress={removerSelecionadas}
        disabled={selectedKeys.size === 0}
        style={[
          styles.deleteSelectedBtn,
          { opacity: selectedKeys.size === 0 ? 0.5 : 1 },
        ]}
      >
        <Text style={styles.deleteSelectedText}>
          Excluir ({selectedKeys.size})
        </Text>
      </Pressable>
    )}

    {/* ✏️ Editar/Concluir */}
   {/*} <Pressable
      onPress={() => setEditMode((v) => !v)}
      style={[
        styles.editBtn,
        {
          borderColor: colors.outline,
          backgroundColor: editMode ? colors.cardBg : "transparent",
        },
      ]}
    >
      <Text style={{ color: colors.outlineText, fontWeight: "900" }}>
        {editMode ? "Concluir" : "Editar"}
      </Text>
    </Pressable>
  </View>
</View>*/}





      {receitas.length === 0 && (
        <Text style={{ color: textMuted, marginTop: 12 }}>
          Busque suas primeiras receitas na tela Início.
        </Text>
      )}

      {receitasParaMostrar.map((receita, index) => {
        const expandida = aberta === receita.nome;        const k = keyFromReceita(receita);
        const isSelected = !!k && selectedKeys.has(k);


        const ingredientes = Array.isArray(receita.ingredientes)
          ? receita.ingredientes
          : [];
        const modo = Array.isArray(receita.modo_preparo) ? receita.modo_preparo : [];

        return (
          <TouchableOpacity
            key={`${receita.nome.trim().toLowerCase()}::${index}`}
style={[
  styles.card,
  { backgroundColor: cardBg },
  editMode && styles.cardSelectable,
  isSelected && { borderColor: colors.primary, borderWidth: 2 },
]}
onPress={() => {
  if (editMode) {
    toggleSelect(receita.nome);
    return;
  }
  setAberta(expandida ? null : receita.nome);
}}

            activeOpacity={0.9}
          >
<View style={styles.cardTop}>
  {editMode && (
    <View
      style={[
        styles.checkDot,
        { borderColor: colors.outline },
        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
    />
  )}

  <Text
    style={[styles.cardTitle, { color: text, flex: 1 }]}
    numberOfLines={2}
  >
    {receita.nome}
  </Text>

  {/* ⭐ Estrela – só aparece fora do modo editar */}
  {!editMode && (
    <Pressable
      onPress={() => toggleFavorita(receita.nome)}
      hitSlop={10}
      onPressIn={(e) => e.stopPropagation()}
      style={styles.starBtn}
    >
      <Text
        style={[
          styles.starText,
          { color: receita.favorita ? "#E1B84A" : "#9E9E9E" },
        ]}
      >
        ★
      </Text>
    </Pressable>
  )}
</View>



            {!editMode && expandida && (
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
                  <Text style={styles.removerTexto}>Excluir receita</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 56, paddingBottom: 28 },

  header: { marginBottom: 18, alignItems: "center", },
    subtitle: { fontSize: 13,
  lineHeight: 18, },

    sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 12,
  },

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
  cardTop: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},

deletePill: {
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#D32F2F",
},

deletePillText: {
  color: "#FFF",
  fontWeight: "900",
  fontSize: 14,
  lineHeight: 14,
},

topRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
},

editBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
   alignItems: "center",
  justifyContent: "center",
},

deleteSelectedBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 10,
  backgroundColor: "#D32F2F",
   alignItems: "center",
  justifyContent: "center",
},

deleteSelectedText: {
  color: "#FFF",
  fontWeight: "900",
},

checkDot: {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
},



cardSelectable: {
  // deixa o card com “cara” de item selecionável
},

starBtn: {
  width: 36,
  height: 36,
  alignItems: "center",
  justifyContent: "center",
},

starText: {
  fontSize:26,
  fontWeight: "900",
},

starFilterBtn: {
  width: 70,
  height: 40,
  borderRadius: 10,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},

headerWrap: {
  borderBottomWidth: StyleSheet.hairlineWidth,
  paddingBottom: 10,
},

headerLogoRow: {
  alignItems: "center",
  justifyContent: "center",
  paddingTop: 6,
  paddingBottom: 12,
},

headerBottomRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingTop: 8,
},

headerRecentes: {
  fontSize: 16,
  fontWeight: "800",
},

headerActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

headerIconBtn: {
  width: 80,
  height: 32,
  borderRadius: 10,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},

headerStar: {
  fontSize: 14,
  fontWeight: "900",
},

headerEditBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
},

headerDeleteBtn: {
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 10,
  backgroundColor: "#D32F2F",
},

headerDeleteText: {
  color: "#FFF",
  fontWeight: "900",
},

headerSubtitleRow: {
  paddingHorizontal: 16,
  paddingBottom: 20,
},



});
