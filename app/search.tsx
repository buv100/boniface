import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDateRu, useApp } from "@/context/AppContext";
import { getLocalizedStockItem, useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

type ResultKind = "employee" | "stock" | "day";

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  route?: string;
  onPress?: () => void;
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr, isRTL } = useLang();
  const { employees, dayEntries } = useApp();
  const { stockItems } = useBoniface();
  const [query, setQuery] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];

    const out: SearchResult[] = [];

    for (const emp of employees) {
      const hay = `${emp.name} ${(emp.roles ?? []).join(" ")} ${emp.phone ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          id: `emp-${emp.id}`,
          kind: "employee",
          title: emp.name,
          subtitle:
            (emp.roles ?? []).length > 0
              ? (emp.roles ?? []).join(" · ")
              : tr.search.employeeFallback,
          route: "/team",
        });
      }
    }

    for (const raw of stockItems) {
      const item = getLocalizedStockItem(raw, tr);
      const hay = `${item.name} ${item.category} ${item.unit}`.toLowerCase();
      if (hay.includes(q) || tr.categories[item.category]?.toLowerCase().includes(q)) {
        out.push({
          id: `stock-${item.id}`,
          kind: "stock",
          title: item.name,
          subtitle: `${tr.categories[item.category]} · ${item.quantity} ${item.unit}`,
          route: "/bar",
        });
      }
    }

    for (const day of dayEntries) {
      const dateLabel = formatDateRu(day.date);
      const names = day.shifts.map((s) => s.employeeName).join(" ");
      const hay = `${day.date} ${dateLabel} ${names} ${day.totalCash} ${day.totalCard}`.toLowerCase();
      if (hay.includes(q) || dateLabel.includes(q)) {
        const tips = day.totalCash + day.totalCard;
        out.push({
          id: `day-${day.id}`,
          kind: "day",
          title: dateLabel,
          subtitle: tr.search.daySub(day.shifts.length, tips.toFixed(0)),
          route: "/history",
        });
      }
    }

    return out.slice(0, 40);
  }, [query, employees, stockItems, dayEntries, tr]);

  const grouped = useMemo(() => {
    const g: Record<ResultKind, SearchResult[]> = {
      employee: [],
      stock: [],
      day: [],
    };
    for (const r of results) g[r.kind].push(r);
    return g;
  }, [results]);

  const iconFor = (kind: ResultKind) => {
    if (kind === "employee") return "users";
    if (kind === "stock") return "package";
    return "calendar";
  };

  const sectionTitle = (kind: ResultKind) => {
    if (kind === "employee") return tr.search.sectionEmployees;
    if (kind === "stock") return tr.search.sectionStock;
    return tr.search.sectionDays;
  };

  const handlePress = (r: SearchResult) => {
    Haptics.selectionAsync();
    if (r.route) router.push(r.route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[
              styles.input,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={tr.search.placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {query.trim().length === 0 && (
          <View style={styles.emptyWrap}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tr.search.emptyTitle}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {tr.search.emptySub}
            </Text>
          </View>
        )}

        {query.trim().length > 0 && results.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {tr.search.noResults}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {tr.search.noResultsSub}
            </Text>
          </View>
        )}

        {(["employee", "stock", "day"] as ResultKind[]).map((kind) => {
          const items = grouped[kind];
          if (items.length === 0) return null;
          return (
            <View key={kind} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                {sectionTitle(kind)}
              </Text>
              {items.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.row,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => handlePress(r)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}
                  >
                    <Feather
                      name={iconFor(kind) as any}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text
                      style={[styles.rowSub, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {r.subtitle}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
  },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  emptyWrap: { alignItems: "center", paddingTop: 64, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.7,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
