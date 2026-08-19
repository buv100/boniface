import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

export default function OwnerHomeScreen() {
  const colors = useColors();
  const { tr, isRTL } = useLang();

  const tiles = [
    { key: "staff", icon: "users" as const, label: tr.owner.tileStaff, href: "/owner/staff" },
    { key: "stock", icon: "layers" as const, label: tr.owner.tileStock, href: "/owner/inventory" },
    { key: "bar", icon: "coffee" as const, label: tr.owner.tileBarMenu, href: "/owner/bar-menu" },
    { key: "kitchen", icon: "box" as const, label: tr.owner.tileKitchenMenu, href: "/owner/kitchen-menu" },
    { key: "sup", icon: "truck" as const, label: tr.owner.tileSuppliers, href: "/owner/suppliers" },
    { key: "set", icon: "settings" as const, label: tr.owner.tileSettings, href: "/owner/settings" },
  ];

  return (
    <OwnerShell>
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
    </OwnerShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
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
});
