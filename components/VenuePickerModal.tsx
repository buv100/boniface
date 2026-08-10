import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthVenue, useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function VenuePickerModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { venue, venues, switchVenue } = useAuth();

  const list: AuthVenue[] =
    venues.length > 0 ? venues : venue ? [venue] : [];

  const handleSelect = (id: string) => {
    switchVenue(id);
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginTop: (Platform.OS === "web" ? 67 : insets.top) + 48,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            {tr.venuePicker.title}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {list.length <= 1 ? tr.venuePicker.singleHint : tr.venuePicker.multiHint}
          </Text>

          {list.map((v) => {
            const active = v.id === venue?.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.row,
                  {
                    backgroundColor: active ? colors.primary + "18" : colors.secondary,
                    borderColor: active ? colors.primary + "55" : colors.border,
                  },
                ]}
                onPress={() => handleSelect(v.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="map-pin" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {v.name}
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {v.currency} · {v.timezone}
                  </Text>
                </View>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}

          {list.length === 0 && (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              {tr.venuePicker.empty}
            </Text>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, { color: colors.mutedForeground }]}>
              {tr.venuePicker.close}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  card: {
    width: "88%",
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },
  closeBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  closeText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
