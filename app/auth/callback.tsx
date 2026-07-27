import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { supabase } from "@/auth/supabase";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

async function completeAuthFromUrl(url: string): Promise<void> {
  const hashIdx = url.indexOf("#");
  const queryIdx = url.indexOf("?");
  const hash = hashIdx >= 0 ? url.slice(hashIdx + 1) : "";
  const query =
    queryIdx >= 0
      ? url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined)
      : "";
  const params = new URLSearchParams(hash || query);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const code = params.get("code");

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) throw error;
    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = (await Linking.getInitialURL()) ?? Linking.createURL("auth/callback");
        await completeAuthFromUrl(url);
        if (!alive) return;
        setStatus("Signed in");
      } catch (e) {
        if (alive) setStatus((e as Error).message || "Auth complete");
      } finally {
        if (alive) {
          setTimeout(() => router.replace("/account"), 400);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brass} />
        <Text variant="soft" style={{ marginTop: spacing.md, textAlign: "center" }}>
          {status}
        </Text>
      </View>
    </Screen>
  );
}
