import React from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  ActivityIndicator,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Variant = "primary" | "ghost" | "danger";

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  label,
  variant = "primary",
  loading,
  disabled,
  onPress,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={(e) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary
            ? colors.brass
            : isDanger
              ? colors.dangerBg
              : "rgba(255,255,255,0.08)",
          borderColor: isPrimary ? colors.brass : colors.line,
          // Disabled and pressed were both 0.8, so a button you cannot use
          // looked like a button mid-tap. Unavailable has to read as
          // unavailable at rest, without waiting for an interaction.
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onBrass : colors.text} />
      ) : (
        <Text
          variant="body"
          style={{
            fontFamily: "Sora_600SemiBold",
            fontSize: 15,
            color: isPrimary
              ? colors.onBrass
              : isDanger
                ? colors.danger
                : colors.text,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Hairline({ style }: { style?: object }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.hairline },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
