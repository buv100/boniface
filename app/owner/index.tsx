import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import { apiCall } from "@/lib/api";
import type { FinanceSummary } from "@/lib/ownerTypes";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function money(n: number) {
  return `${Math.round(n).toLocaleString()} ₪`;
}

export default function OwnerHomeScreen() {
  const colors = useColors();
  const { tr, isRTL } = useLang();
  const { token } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"revenue" | "expense">("revenue");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    if (!token) return;
    const data = await apiCall<FinanceSummary>(`/owner/finance/summary?month=${month}`, { token });
    setSummary(data);
  }, [token, month]);

  useEffect(() => {
    load().catch(() => setSummary(null));
  }, [load]);

  const save = async () => {
    if (!token) return;
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    await apiCall("/owner/finance/entries", {
      method: "POST",
      token,
      body: { date, kind, amount: n, note: note.trim() || null },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOpen(false);
    setAmount("");
    setNote("");
    await load();
  };

  const tiles = [
    { key: "sched", icon: "calendar" as const, label: tr.owner.tileSchedule, href: "/owner/schedule" },
    { key: "staff", icon: "users" as const, label: tr.owner.tileStaff, href: "/owner/staff" },
    { key: "stock", icon: "layers" as const, label: tr.owner.tileStock, href: "/owner/inventory" },
    { key: "bar", icon: "coffee" as const, label: tr.owner.tileBarMenu, href: "/owner/bar-menu" },
    { key: "kitchen", icon: "box" as const, label: tr.owner.tileKitchenMenu, href: "/owner/kitchen-menu" },
    { key: "sup", icon: "truck" as const, label: tr.owner.tileSuppliers, href: "/owner/suppliers" },
    { key: "set", icon: "settings" as const, label: tr.owner.tileSettings, href: "/owner/settings" },
  ];

  return (
    <OwnerShell>
      <View style={[styles.monthRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={10}>
          <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>
          {tr.owner.monthLabel} {month}
        </Text>
        <TouchableOpacity onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={10}>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{tr.owner.revenue}</Text>
          <Text style={[styles.kpiVal, { color: colors.foreground }]}>{money(summary?.revenue ?? 0)}</Text>
        </View>
        <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{tr.owner.expenses}</Text>
          <Text style={[styles.kpiVal, { color: colors.foreground }]}>{money(summary?.expenses ?? 0)}</Text>
        </View>
        <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{tr.owner.profit}</Text>
          <Text style={[styles.kpiVal, { color: (summary?.profit ?? 0) >= 0 ? colors.primary : colors.destructive }]}>
            {money(summary?.profit ?? 0)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.addFin, { backgroundColor: colors.primary }]}
          onPress={() => {
            setKind("revenue");
            setOpen(true);
          }}
        >
          <Text style={styles.addFinTxt}>{tr.owner.addRevenue}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addFin, { borderWidth: 1, borderColor: colors.border }]}
          onPress={() => {
            setKind("expense");
            setOpen(true);
          }}
        >
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>{tr.owner.addExpense}</Text>
        </TouchableOpacity>
      </View>

      {(summary?.entries ?? []).length === 0 ? (
        <Text style={{ color: colors.mutedForeground, marginBottom: 8 }}>{tr.owner.noFinance}</Text>
      ) : (
        (summary?.entries ?? []).slice(0, 5).map((e) => (
          <View key={e.id} style={[styles.entry, { borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, flex: 1 }}>
              {e.date} · {e.kind === "revenue" ? tr.owner.revenue : tr.owner.expenses}
              {e.note ? ` · ${e.note}` : ""}
            </Text>
            <Text style={{ color: e.kind === "revenue" ? colors.primary : colors.destructive, fontFamily: "Inter_600SemiBold" }}>
              {e.kind === "expense" ? "−" : "+"}
              {money(e.amount)}
            </Text>
          </View>
        ))
      )}

      <View style={styles.grid}>
        {tiles.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(t.href as any)}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
              <Feather name={t.icon} size={22} color={colors.primary} />
            </View>
            <Text style={[styles.tileLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 10 }}>
              {kind === "revenue" ? tr.owner.addRevenue : tr.owner.addExpense}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.date}
              placeholderTextColor={colors.mutedForeground}
              value={date}
              onChangeText={setDate}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.amount}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder={tr.owner.notes}
              placeholderTextColor={colors.mutedForeground}
              value={note}
              onChangeText={setNote}
            />
            <TouchableOpacity style={[styles.addFin, { backgroundColor: colors.primary }]} onPress={save}>
              <Text style={styles.addFinTxt}>{tr.owner.save}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOpen(false)} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: colors.mutedForeground }}>{tr.owner.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  monthRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 10 },
  kpiLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  kpiVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 10 },
  addFin: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  addFinTxt: { fontFamily: "Inter_700Bold", color: "#111827" },
  entry: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6, gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  tile: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
});
