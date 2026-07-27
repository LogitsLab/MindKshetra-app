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
              : colors.surface,
          borderColor: isPrimary ? colors.brass : colors.line,
          opacity: pressed || disabled ? 0.75 : 1,
        },
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onBrass : colors.text} />
      ) : (
        <Text
          variant="body"
          style={{
            fontFamily: "Sora_600SemiBold",
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
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.hairline }, style]} />;
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
