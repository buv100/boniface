import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

/** Large gold primary action — one clear next step */
export function PrimaryButton({
  label,
  icon,
  onPress,
  variant = "primary",
  style,
}: {
  label: string;
  icon?: FeatherName;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  style?: ViewStyle;
}) {
  const colors = useColors();
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? "rgba(239,68,68,0.15)"
        : "rgba(255,255,255,0.06)";
  const fg =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "danger"
        ? "#F87171"
        : colors.foreground;
  const border =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? "rgba(239,68,68,0.35)"
        : colors.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Soft guidance strip under hero / empty areas */
export function HintBanner({
  text,
  icon = "info",
}: {
  text: string;
  icon?: FeatherName;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.hint,
        { backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.22)" },
      ]}
      accessibilityRole="text"
    >
      <Feather name={icon} size={16} color={colors.primary} />
      <Text style={[styles.hintText, { color: colors.mutedForeground }]}>{text}</Text>
    </View>
  );
}

/** Friendly empty state with optional CTA */
export function EmptyState({
  title,
  subtitle,
  icon = "inbox",
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  icon?: FeatherName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty} accessibilityRole="summary">
      <View style={[styles.emptyIcon, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={{ marginTop: 16, alignSelf: "stretch" }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
