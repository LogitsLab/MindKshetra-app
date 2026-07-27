import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

/** Soft atmospheric veil without extra native deps. */
export function LinearGradientFallback() {
  const { colors, mode } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.top,
          {
            backgroundColor:
              mode === "dark" ? "rgba(61,122,106,0.12)" : "rgba(15,118,110,0.06)",
          },
        ]}
      />
      <View
        style={[
          styles.bottom,
          {
            backgroundColor:
              mode === "dark" ? "rgba(201,162,39,0.05)" : "rgba(201,162,39,0.08)",
          },
        ]}
      />
      <View style={[styles.veil, { backgroundColor: colors.void, opacity: 0.35 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  bottom: {
    position: "absolute",
    bottom: 80,
    left: 40,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  veil: {
    ...StyleSheet.absoluteFill,
  },
});
