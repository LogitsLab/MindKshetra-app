import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { useLanguage } from "@/context/LanguageContext";
import { spacing } from "@/theme/tokens";

export default function HoroscopeScreen() {
  const router = useRouter();
  const { lang } = useLanguage();
  const L = lang === "hi" ? "hi" : "en";
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="display">{L === "hi" ? "राशिफल" : "Horoscope"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {L === "hi"
            ? "मार्गदर्शन आपके चार्ट तथ्यों से आता है — कल्पित ग्रह नहीं।"
            : "Guidance is narrated from your chart facts — never invented placements."}
        </Text>
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button
            label={L === "hi" ? "ज्योतिष केंद्र" : "Astrology hub"}
            onPress={() => router.push("/(tabs)/astrology")}
          />
          <Button
            label={L === "hi" ? "गुप्त कुंडली" : "Incognito chart"}
            variant="ghost"
            onPress={() => router.push("/astrology/incognito")}
          />
          <Button
            label={L === "hi" ? "पंचांग" : "Panchang"}
            variant="ghost"
            onPress={() => router.push("/panchang")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
