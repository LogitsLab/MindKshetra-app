import React from "react";
import {
  View,
  StyleSheet,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Atmosphere } from "@/components/Atmosphere";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  atmosphere?: "default" | "strong" | "soft" | "none";
};

export function Screen({
  children,
  padded = true,
  edges = ["top", "left", "right"],
  style,
  contentStyle,
  atmosphere = "default",
  ...rest
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.void }, style]} {...rest}>
      {atmosphere !== "none" ? <Atmosphere intensity={atmosphere} /> : null}
      <SafeAreaView edges={edges} style={styles.flex}>
        <View
          style={[
            styles.flex,
            padded && { paddingHorizontal: spacing.md },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
});
