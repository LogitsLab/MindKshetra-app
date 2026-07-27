import React from "react";
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  padded?: boolean;
  blur?: boolean;
};

export function Panel({
  children,
  style,
  strong = false,
  padded = true,
  blur = false,
}: Props) {
  const { colors, mode } = useTheme();
  const fill = strong ? colors.panelStrong : colors.panel;

  const body = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: blur && Platform.OS === "ios" ? "transparent" : fill,
          borderColor: colors.line,
        },
        padded && { padding: spacing.md },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (blur && Platform.OS === "ios") {
    return (
      <BlurView
        intensity={mode === "dark" ? 28 : 40}
        tint={mode === "dark" ? "dark" : "light"}
        style={[styles.blurWrap, { borderColor: colors.line }, style]}
      >
        <View style={[padded && { padding: spacing.md }]}>{children}</View>
      </BlurView>
    );
  }

  return body;
}

export function Glass(props: Omit<Props, "blur">) {
  return <Panel {...props} blur strong />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
  blurWrap: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
  },
});
