import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useLanguage } from "@/context/LanguageContext";
import { spacing } from "@/theme/tokens";

export default function TransitsScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{L === "hi" ? "गोचर" : "Transits"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {L === "hi"
            ? "गोचर हिट जन्म कुंडली के विरुद्ध गणना होते हैं। चार्ट खोलें।"
            : "Transit hits are computed against a natal chart. Open a chart to read them."}
        </Text>
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button
            label={L === "hi" ? "गुप्त कुंडली" : "Incognito chart"}
            onPress={() => router.push("/astrology/incognito")}
          />
          <Button
            label={L === "hi" ? "सदस्य" : "Saved members"}
            variant="ghost"
            onPress={() => router.push("/astrology/members")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
