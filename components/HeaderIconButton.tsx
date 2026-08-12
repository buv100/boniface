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

/** Header action with a tooltip above on hover (web) or long-press (native). */
export function HeaderIconButton({ hint, onPress, accessibilityLabel, style, children }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrap} collapsable={false}>
      {show ? (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>{hint}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        onHoverIn={() => setShow(true)}
        onHoverOut={() => setShow(false)}
        onLongPress={() => setShow(true)}
        onPressOut={() => {
          if (Platform.OS !== "web") setShow(false);
        }}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? hint}
        accessibilityHint={hint}
        style={({ hovered, pressed }) => [
          style,
          (hovered || pressed) && styles.hovered,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    zIndex: 20,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 180,
    zIndex: 50,
    ...Platform.select({
      web: { boxShadow: "0 8px 20px rgba(0,0,0,0.35)" } as object,
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      },
    }),
  },
  tooltipText: {
    color: "#F9FAFB",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 15,
  },
  hovered: { opacity: 0.88 },
});
