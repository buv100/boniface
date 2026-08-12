import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface Props {
  hint: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const isWeb = Platform.OS === "web";

/** Web: hint on hover. Phone: always-visible one-word label under the icon. */
export function HeaderIconButton({ hint, onPress, accessibilityLabel, style, children }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <View style={styles.wrap} collapsable={false}>
      {isWeb && hovered ? (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText} numberOfLines={1}>
            {hint}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? hint}
        style={({ pressed }) => [style, (hovered || pressed) && styles.pressed]}
      >
        {children}
      </Pressable>
      {!isWeb ? (
        <Text style={styles.caption} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 20,
    alignItems: "center",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    alignSelf: "center",
    marginBottom: 8,
    backgroundColor: "rgba(17,24,39,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: 140,
    zIndex: 50,
    ...Platform.select({
      web: { boxShadow: "0 8px 20px rgba(0,0,0,0.35)" } as object,
      default: {},
    }),
  },
  tooltipText: {
    color: "#F9FAFB",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 14,
  },
  caption: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    maxWidth: 48,
  },
  pressed: { opacity: 0.88 },
});
