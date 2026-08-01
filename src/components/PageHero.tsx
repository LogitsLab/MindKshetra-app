import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  image: ImageSourcePropType;
  eyebrow?: string;
  title: string;
  body?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The painted header band — the same image + scrim + copy idiom the home
 * grid's path cards use, lifted out so the sections that were shipping as
 * bare text (paths, sādhana, panchang, community, meditation) get the same
 * depth. Ports the web's PageHeroImage.
 *
 * Devanagari never takes the tracked, uppercased eyebrow: Fraunces has no
 * Devanagari coverage and letter-spacing breaks matra shaping, so the hi
 * eyebrow drops both (docs/design/VISUAL_SYSTEM.md).
 */
export function PageHero({ image, eyebrow, title, body, onPress, style }: Props) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const hiEyebrow =
    lang === "hi"
      ? { letterSpacing: 0, textTransform: "none" as const }
      : null;
  const hiTitle =
    lang === "hi"
      ? { fontFamily: "NotoSerifDevanagari_600SemiBold" as const }
      : null;

  const content = (
    <>
      <Image source={image} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(7,9,15,0.28)", "rgba(7,9,15,0.62)", "rgba(7,9,15,0.92)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.copy}>
        {eyebrow ? (
          <Text variant="eyebrow" color={colors.brassSoft} style={hiEyebrow}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          variant="title"
          color={colors.onMedia}
          style={[styles.title, hiTitle]}
        >
          {title}
        </Text>
        {body ? (
          <Text
            variant="soft"
            color={colors.onMediaMuted}
            style={{ marginTop: spacing.sm }}
          >
            {body}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.band,
          { borderColor: colors.line, opacity: pressed ? 0.94 : 1 },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.band, { borderColor: colors.line }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    minHeight: 180,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: "flex-end",
  },
  copy: {
    padding: spacing.lg,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: 26,
    lineHeight: 32,
  },
});
