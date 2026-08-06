import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_CREDIT, BRAND_NAME } from "@/components/BrandWordmark";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { MoodIcon } from "@/components/MoodIcon";
import { Rise } from "@/components/Rise";
import {
  EMPTY_PERSONALIZATION,
  PERSONALIZATION_STORAGE_KEY,
  type PersonalizationDraft,
} from "@/data/personalization";
import { moods, previewMoodIds } from "@/data/moods";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { moodAccent } from "@/theme/assets";
import { motion, radii, spacing } from "@/theme/tokens";

const HOME_VISITED_KEY = "mindkshetra-home-visited";

const ROTATING_LINES_EN = [
  "A verse, a short sit, guidance when you need it.",
  "Meet the mind where it is, not where it should be.",
  "Clarity for the battlefield of the day.",
  "One honest line can steady the field.",
  "Scripture that knows who is asking.",
  "Sit with one verse. Let the rest wait.",
];

const ROTATING_LINES_HI = [
  "एक श्लोक, एक छोटी बैठक, ज़रूरत पर मार्गदर्शन।",
  "मन जहाँ है वहीं मिलें, जहाँ होना चाहिए वहाँ नहीं।",
  "आज के कुरुक्षेत्र के लिए स्पष्टता।",
  "एक सच्ची पंक्ति क्षेत्र को स्थिर कर सकती है।",
  "वह शास्त्र जो जानता है कि कौन पूछ रहा है।",
  "एक श्लोक के साथ बैठें। बाकी प्रतीक्षा करे।",
];

type Props = {
  votdSanskrit?: string | null;
  /** Safe-area top, brand floats on atmosphere, no solid header chrome. */
  topInset?: number;
  streak?: number;
};

function hourBucket(h: number): "dawn" | "day" | "dusk" | "night" {
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 17) return "day";
  if (h >= 17 && h < 21) return "dusk";
  return "night";
}

function tintFor(bucket: ReturnType<typeof hourBucket>): [string, string] {
  switch (bucket) {
    case "dawn":
      return ["rgba(80,48,28,0.18)", "rgba(7,9,15,0)"];
    case "day":
      return ["rgba(28,48,72,0.12)", "rgba(7,9,15,0)"];
    case "dusk":
      return ["rgba(72,36,48,0.16)", "rgba(7,9,15,0)"];
    default:
      return ["rgba(16,24,56,0.2)", "rgba(7,9,15,0)"];
  }
}

function greetingFor(
  h: number,
  name: string | null,
  lang: "en" | "hi"
): string {
  const hi = lang === "hi";
  const who = name?.trim();
  if (h >= 5 && h < 12) {
    return who
      ? hi
        ? `सुप्रभात, ${who}`
        : `Good morning, ${who}`
      : hi
        ? "सुप्रभात"
        : "Good morning";
  }
  if (h >= 12 && h < 17) {
    return who
      ? hi
        ? `नमस्ते, ${who}`
        : `Welcome back, ${who}`
      : hi
        ? "नमस्ते"
        : "Welcome back";
  }
  if (h >= 17 && h < 21) {
    return who
      ? hi
        ? `शुभ संध्या, ${who}`
        : `Good evening, ${who}`
      : hi
        ? "शुभ संध्या"
        : "Good evening";
  }
  return who
    ? hi
      ? `विश्राम लो, ${who}`
      : `Ease in, ${who}`
    : hi
      ? "रात्रि में विश्राम"
      : "Ease into the night";
}

function PracticeIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2.5 3 4 5.5 4 8a4 4 0 11-8 0c0-2.5 1.5-5 4-8z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MadhavIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 18c1.5-4 4-6 7-6s5.5 2 7 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth="1.5" />
      <Path
        d="M16 5.5c1.2-.8 2.4-.6 3 .4"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Adaptive home hero: brand-first composition over a transparent atmosphere.
 */
export function HomeHero({
  votdSanskrit,
  topInset = 0,
  streak = 0,
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const [returning, setReturning] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const breathe = useRef(new Animated.Value(0)).current;
  const now = new Date();
  const hour = now.getHours();
  const dayIndex = Math.floor(Date.now() / 86400000);
  const bucket = hourBucket(hour);
  // Android edge-to-edge can report 0 until layout; StatusBar height is a floor.
  const safeTop = Math.max(
    topInset,
    Platform.OS === "android" ? StatusBar.currentHeight ?? 24 : 0
  );
  // Scale the lockup to the row: mark + gap + optional streak leave ~width-120.
  const brandSize =
    width < 340 ? 24 : width < 380 ? 28 : width < 420 ? 32 : 34;

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const visited = await AsyncStorage.getItem(HOME_VISITED_KEY);
        if (alive) setReturning(visited === "1");
        if (!visited) {
          await AsyncStorage.setItem(HOME_VISITED_KEY, "1");
        }
      } catch {
        /* guest storage flaky, treat as first visit */
      }
      try {
        const raw = await AsyncStorage.getItem(PERSONALIZATION_STORAGE_KEY);
        if (!raw || !alive) return;
        const draft = {
          ...EMPTY_PERSONALIZATION,
          ...(JSON.parse(raw) as PersonalizationDraft),
        };
        if (draft.displayName?.trim()) setDisplayName(draft.displayName.trim());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const heroMoods = useMemo(() => {
    return previewMoodIds
      .map(
        (id, i) =>
          moods.find((m) => m.id === id) ?? moods[(dayIndex + i) % moods.length]
      )
      .filter(Boolean)
      .slice(0, 4);
  }, [dayIndex]);

  const lines = lang === "hi" ? ROTATING_LINES_HI : ROTATING_LINES_EN;
  const rotating = lines[dayIndex % lines.length];
  const greetingLang = lang === "hi" ? "hi" : "en";
  const greeting = greetingFor(
    hour,
    displayName?.trim() || (greetingLang === "hi" ? "Parth" : "Seeker"),
    greetingLang
  );
  const watermark =
    votdSanskrit?.replace(/\s+/g, " ").trim().slice(0, 18) || "मनः";
  const ringScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  const ringOpacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });
  const [tintA, tintB] = tintFor(bucket);

  return (
    <Rise
      delay={motion.staggerMs}
      style={{ ...styles.hero, paddingTop: safeTop + spacing.sm }}
    >
      <LinearGradient
        colors={[tintA, tintB]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.ringWrap,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      >
        <View
          style={[styles.ring, styles.ringOuter, { borderColor: colors.brass }]}
        />
        <View
          style={[
            styles.ring,
            styles.ringMid,
            { borderColor: colors.brassSoft },
          ]}
        />
        <View
          style={[styles.ring, styles.ringInner, { borderColor: colors.brass }]}
        />
      </Animated.View>

      <Text
        style={[
          styles.watermark,
          { color: colors.text, top: safeTop + spacing.md },
        ]}
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {watermark}
      </Text>

      <View style={styles.brandRow}>
        <BrandMark size={width < 360 ? 26 : 30} />
        <View style={styles.brandCopy}>
          <Text
            variant="display"
            color={colors.onMedia}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.brandName,
              { fontSize: brandSize, lineHeight: brandSize + 4 },
            ]}
          >
            {BRAND_NAME}
          </Text>
          <View style={styles.textScrim}>
            <Text
              variant="muted"
              color="rgba(232,228,220,0.9)"
              style={styles.credit}
            >
              {BRAND_CREDIT}
            </Text>
          </View>
        </View>
        {streak > 0 ? (
          <View style={[styles.streakPill, styles.textScrim]}>
            <View
              style={[styles.brandDot, { backgroundColor: colors.brass }]}
            />
            <Text variant="muted" color={colors.brassSoft}>
              {streak} {t("homeStreakLabel")}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        variant="title"
        color={colors.brassSoft}
        style={styles.tagline}
      >
        {returning ? greeting : t("homeTagline")}
      </Text>
      <Text
        variant="soft"
        color="rgba(232,228,220,0.94)"
        style={styles.body}
      >
        {returning ? rotating : t("homeHeroBody")}
      </Text>

      <View style={styles.ctaRow}>
        <View style={{ flex: 1.2 }}>
          <Button
            label={t("homeCtaPractice")}
            leading={<PracticeIcon color={colors.onBrass} />}
            onPress={() => router.push("/sadhana")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t("homeCtaMadhav")}
            variant="ghost"
            leading={<MadhavIcon color={colors.text} />}
            onPress={() => router.push("/madhav")}
          />
        </View>
      </View>

      <View style={styles.moodHead}>
        <View style={styles.textScrim}>
          <Text variant="eyebrow" color={colors.brassSoft}>
            {lang === "hi" ? "अभी कैसा लगता है?" : "How are you arriving?"}
          </Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/mood")} hitSlop={8}>
          <View style={styles.textScrim}>
            <Text
              variant="muted"
              color="rgba(232,228,220,0.88)"
              style={styles.allMoods}
            >
              {t("homeMoodsAll")} →
            </Text>
          </View>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.moodRow}
      >
        {heroMoods.map((mood) => {
          const accent = moodAccent[mood.id] ?? colors.brass;
          return (
            <Pressable
              key={mood.id}
              onPress={() => router.push(`/(tabs)/mood/${mood.id}`)}
              style={({ pressed }) => [
                styles.moodChip,
                {
                  borderColor: "rgba(201,162,39,0.28)",
                  backgroundColor: pressed
                    ? "rgba(7,9,15,0.72)"
                    : "rgba(7,9,15,0.58)",
                },
              ]}
            >
              <MoodIcon id={mood.id} size={18} color={accent} />
              <Text
                variant="body"
                color="rgba(232,228,220,0.96)"
                style={{ fontSize: 13, fontFamily: "Sora_600SemiBold" }}
              >
                {lang === "hi" ? mood.labelHi : mood.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Rise>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
    paddingBottom: spacing.md,
    minHeight: 0,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  brandCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  brandName: {
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  credit: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
    maxWidth: "28%",
  },
  brandDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    opacity: 0.7,
  },
  ringWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 999,
  },
  ringOuter: { width: 240, height: 240, opacity: 0.3 },
  ringMid: { width: 170, height: 170, opacity: 0.4 },
  ringInner: { width: 110, height: 110, opacity: 0.5 },
  watermark: {
    position: "absolute",
    right: -8,
    fontFamily: "NotoSerifDevanagari_600SemiBold",
    fontSize: 72,
    lineHeight: 88,
    opacity: 0.055,
  },
  /** Per-line dark plate for small labels only (not greeting / hero body). */
  textScrim: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    backgroundColor: "rgba(7,9,15,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  tagline: {
    fontSize: 20,
    lineHeight: 26,
    maxWidth: 340,
    letterSpacing: -0.2,
  },
  body: {
    marginTop: spacing.sm,
    maxWidth: 320,
    fontSize: 14,
    lineHeight: 21,
  },
  ctaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  moodHead: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  allMoods: {
    fontSize: 12,
  },
  moodRow: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
