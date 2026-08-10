import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoniface } from "@/context/BonifaceContext";
import { useLang } from "@/context/LangContext";
import { useColors } from "@/hooks/useColors";
import {
  FEATURE_CARDS,
  RARITY_COLORS,
  type FeatureCard,
} from "@/lib/featureCards";


const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
const UPGRADE_ICONS = ["shield", "upload", "bar-chart-2", "trending-up", "package", "award"] as const;

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tr } = useLang();
  const { isPremium, setPremium } = useBoniface();
  const [selected, setSelected] = useState<FeatureCard | null>(null);
  const [upgradeModal, setUpgradeModal] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const sorted = [...FEATURE_CARDS].sort(
    (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
  );

  const unlockedCount = sorted.filter((c) => !c.isPremium || isPremium).length;

  const openCard = (card: FeatureCard) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(card);
  };

  const isUnlocked = (card: FeatureCard) => !card.isPremium || isPremium;

  const handleActivate = (card: FeatureCard) => {
    if (!isUnlocked(card)) {
      setUpgradeModal(true);
      return;
    }
    if (card.route) {
      setSelected(null);
      setTimeout(() => router.navigate(card.route as any), 200);
    }
  };

  const c = colors;
  const maxH = Dimensions.get("window").height * 0.88;

  const getCardText = (card: FeatureCard) => {
    const lc = tr.featureCards[card.id];
    return {
      title: lc?.title ?? card.id,
      description: lc?.description ?? "",
      flavor: lc?.flavor ?? "",
    };
  };

  const renderCard = (card: FeatureCard) => {
    const rc = RARITY_COLORS[card.rarity];
    const unlocked = isUnlocked(card);
    const { title, description } = getCardText(card);

    return (
      <TouchableOpacity
        key={card.id}
        style={[styles.card, { backgroundColor: unlocked ? rc.bg : c.card, borderColor: unlocked ? rc.border : c.border }]}
        onPress={() => openCard(card)}
        activeOpacity={0.8}
      >
        <View style={[styles.rarityStripe, { backgroundColor: rc.border, opacity: unlocked ? 1 : 0.35 }]} />

        <View style={[styles.iconBox, { backgroundColor: unlocked ? rc.border + "28" : c.secondary, shadowColor: unlocked ? rc.glow : "transparent" }]}>
          <Feather name={card.icon as any} size={22} color={unlocked ? rc.label : c.mutedForeground} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardMeta}>
            <Text style={[styles.rarityLabel, { color: unlocked ? rc.label : c.mutedForeground }]}>
              {tr.rarityLabels[card.rarity]}
            </Text>
            {!unlocked && (
              <View style={[styles.lockBadge, { backgroundColor: c.secondary, borderColor: c.border }]}>
                <Feather name="lock" size={9} color={c.mutedForeground} />
                <Text style={[styles.lockText, { color: c.mutedForeground }]}>{tr.cards.premium}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardTitle, { color: unlocked ? c.foreground : c.mutedForeground }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.cardDesc, { color: c.mutedForeground }]} numberOfLines={2}>{description}</Text>
        </View>

        <View style={styles.cardRight}>
          {unlocked ? (
            <View style={[styles.activeBadge, { backgroundColor: rc.border + "28", borderColor: rc.border + "55" }]}>
              <View style={[styles.activeDot, { backgroundColor: rc.label }]} />
              <Text style={[styles.activeText, { color: rc.label }]}>{tr.cards.active}</Text>
            </View>
          ) : (
            <Feather name="chevron-right" size={15} color={c.mutedForeground} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={c.mutedForeground} />
          <Text style={[styles.backText, { color: c.mutedForeground }]}>{tr.cards.back}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: c.foreground }]}>{tr.cards.title}</Text>
            <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
              {tr.cards.ofActive(unlockedCount, sorted.length)}
            </Text>
          </View>
          {isPremium ? (
            <View style={[styles.premiumBadge, { backgroundColor: "#F59E0B22", borderColor: "#F59E0B44" }]}>
              <Feather name="star" size={13} color="#F59E0B" />
              <Text style={[styles.premiumText, { color: "#F59E0B" }]}>{tr.cards.premium}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeCta, { backgroundColor: c.primary }]}
              onPress={() => setUpgradeModal(true)}
            >
              <Feather name="zap" size={13} color={c.primaryForeground} />
              <Text style={[styles.upgradeCtaText, { color: c.primaryForeground }]}>{tr.cards.unlockAll}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.progressTrack, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.progressFill, { width: `${(unlockedCount / sorted.length) * 100}%` as any, backgroundColor: "#F59E0B" }]} />
          <Text style={[styles.progressLabel, { color: c.mutedForeground }]}>{unlockedCount}/{sorted.length}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendScroll} contentContainerStyle={styles.legendRow}>
          {(["common", "rare", "epic", "legendary"] as const).map((r) => {
            const rc = RARITY_COLORS[r];
            const cnt = sorted.filter((card) => card.rarity === r).length;
            return (
              <View key={r} style={[styles.legendItem, { backgroundColor: rc.bg, borderColor: rc.border }]}>
                <View style={[styles.legendDot, { backgroundColor: rc.border }]} />
                <Text style={[styles.legendLabel, { color: rc.label }]}>{tr.rarityLabels[r]}</Text>
                <Text style={[styles.legendCount, { color: rc.label }]}>{cnt}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {sorted.map(renderCard)}
        </View>

        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devToggle, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={async () => { await setPremium(!isPremium); Haptics.selectionAsync(); }}
          >
            <Feather name="settings" size={14} color={c.mutedForeground} />
            <Text style={[styles.devText, { color: c.mutedForeground }]}>
              {isPremium ? tr.cards.devToggleOn : tr.cards.devToggleOff}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {selected && (
        <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={() => setSelected(null)} />
            <View style={[styles.detailSheet, { backgroundColor: c.card, maxHeight: maxH, paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={[styles.handle, { backgroundColor: c.border }]} />
              <View style={[styles.detailRarityBar, { backgroundColor: RARITY_COLORS[selected.rarity].border }]} />

              <View style={styles.detailContent}>
                <View style={[
                  styles.detailIconBox,
                  {
                    backgroundColor: isUnlocked(selected) ? RARITY_COLORS[selected.rarity].border + "22" : c.secondary,
                    shadowColor: isUnlocked(selected) ? RARITY_COLORS[selected.rarity].glow : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 16,
                  }
                ]}>
                  <Feather
                    name={selected.icon as any}
                    size={36}
                    color={isUnlocked(selected) ? RARITY_COLORS[selected.rarity].label : c.mutedForeground}
                  />
                </View>

                <Text style={[styles.detailRarity, { color: RARITY_COLORS[selected.rarity].label }]}>
                  {tr.rarityLabels[selected.rarity]}
                </Text>
                <Text style={[styles.detailTitle, { color: c.foreground }]}>{getCardText(selected).title}</Text>
                <Text style={[styles.detailDesc, { color: c.mutedForeground }]}>{getCardText(selected).description}</Text>

                <View style={[styles.flavorBox, { backgroundColor: RARITY_COLORS[selected.rarity].bg, borderColor: RARITY_COLORS[selected.rarity].border + "44" }]}>
                  <Text style={[styles.flavorText, { color: RARITY_COLORS[selected.rarity].label }]}>
                    {getCardText(selected).flavor}
                  </Text>
                </View>

                {isUnlocked(selected) ? (
                  selected.route ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: RARITY_COLORS[selected.rarity].border }]}
                      onPress={() => handleActivate(selected)}
                    >
                      <Feather name="external-link" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>{tr.cards.open}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.comingSoonBox, { backgroundColor: c.secondary, borderColor: c.border }]}>
                      <Feather name="clock" size={16} color={c.mutedForeground} />
                      <Text style={[styles.comingSoonText, { color: c.mutedForeground }]}>{tr.cards.comingSoon}</Text>
                    </View>
                  )
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                    onPress={() => { setSelected(null); setTimeout(() => setUpgradeModal(true), 300); }}
                  >
                    <Feather name="zap" size={16} color="#111827" />
                    <Text style={[styles.actionBtnText, { color: "#111827" }]}>{tr.cards.openInPremium(tr.cards.upgradePrice)}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={upgradeModal} transparent animationType="slide" onRequestClose={() => setUpgradeModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={() => setUpgradeModal(false)} />
          <View style={[styles.upgradeSheet, { backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            <View style={[styles.upgradeHeader, { backgroundColor: "#F59E0B14" }]}>
              <View style={[styles.upgradeIconRing, { borderColor: "#F59E0B44" }]}>
                <View style={[styles.upgradeIconInner, { backgroundColor: "#F59E0B22" }]}>
                  <Feather name="star" size={32} color="#F59E0B" />
                </View>
              </View>
              <Text style={[styles.upgradeTitle, { color: c.foreground }]}>{tr.cards.upgradeTitle}</Text>
              <Text style={[styles.upgradePrice, { color: "#F59E0B" }]}>{tr.cards.upgradePrice}</Text>
              <Text style={[styles.upgradeSub, { color: c.mutedForeground }]}>{tr.cards.upgradeSub}</Text>
            </View>

            <View style={styles.upgradeFeatures}>
              {tr.cards.upgradeFeatures.map((text, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: "#F59E0B22" }]}>
                    <Feather name={UPGRADE_ICONS[i] as any} size={14} color="#F59E0B" />
                  </View>
                  <Text style={[styles.featureText, { color: c.foreground }]}>{text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.upgradePrimaryBtn, { backgroundColor: "#F59E0B" }]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setUpgradeModal(false);
              }}
            >
              <Feather name="zap" size={18} color="#111827" />
              <Text style={[styles.upgradePrimaryText, { color: "#111827" }]}>{tr.cards.upgradeBtn}</Text>
            </TouchableOpacity>
            <Text style={[styles.upgradeNote, { color: c.mutedForeground }]}>{tr.cards.upgradeNote}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  premiumBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  premiumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  upgradeCta: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  upgradeCtaText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, borderWidth: 1, overflow: "hidden", marginBottom: 4, position: "relative" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { position: "absolute", right: 8, top: -1, fontSize: 10, fontFamily: "Inter_600SemiBold" },
  legendScroll: { marginVertical: 14 },
  legendRow: { gap: 8, paddingRight: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  legendCount: { fontSize: 10, fontFamily: "Inter_600SemiBold", opacity: 0.7 },
  grid: { gap: 10 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, gap: 12, overflow: "hidden" },
  rarityStripe: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4, flexShrink: 0 },
  cardBody: { flex: 1, gap: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  rarityLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  lockText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  cardRight: { flexShrink: 0, alignItems: "center" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  devToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 20, alignSelf: "center" },
  devText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  detailSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 0 },
  detailRarityBar: { height: 3, width: "100%", marginTop: 8 },
  detailContent: { padding: 24, alignItems: "center", gap: 10 },
  detailIconBox: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  detailRarity: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  detailTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  detailDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  flavorBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginVertical: 4, width: "100%" },
  flavorText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", lineHeight: 22 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: "100%", marginTop: 4 },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  comingSoonBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, width: "100%", marginTop: 4 },
  comingSoonText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
  upgradeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  upgradeHeader: { padding: 28, alignItems: "center", gap: 10 },
  upgradeIconRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  upgradeIconInner: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  upgradeTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  upgradePrice: { fontSize: 28, fontFamily: "Inter_700Bold" },
  upgradeSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  upgradeFeatures: { paddingHorizontal: 24, paddingBottom: 16, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  upgradePrimaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 24, borderRadius: 16, paddingVertical: 18 },
  upgradePrimaryText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  upgradeNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 10 },
});
