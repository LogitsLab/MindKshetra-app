import React, { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { useTheme } from "@/context/ThemeContext";
import { radii } from "@/theme/tokens";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  /** WHITE reads best on the dark onboarding media; the account screen follows
   *  the active theme. Override when the surface calls for it. */
  variant?: "white" | "black";
  testID?: string;
};

/**
 * Native Sign in with Apple button. Renders only on iOS when the API is
 * available (never on Android/web/simulators without an Apple account), so
 * callers can drop it in unconditionally. Apple requires the system button —
 * a custom-styled button risks a 4.8 rejection.
 */
export function AppleSignInButton({ onPress, disabled, variant, testID }: Props) {
  const { mode } = useTheme();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((v) => {
        if (active) setAvailable(v);
      })
      .catch(() => {
        /* treat as unavailable */
      });
    return () => {
      active = false;
    };
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  const style = variant ?? (mode === "dark" ? "white" : "black");
  const buttonStyle =
    style === "white"
      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      testID={testID}
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={buttonStyle}
      cornerRadius={radii.md}
      style={[styles.button, disabled && styles.disabled]}
      onPress={() => {
        if (!disabled) onPress();
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    width: "100%",
  },
  disabled: {
    opacity: 0.4,
  },
});
