import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Panel } from "@/components/Panel";
import { BackButton } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/SlokaCard";
import { profileApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";

type PublicProfile = {
  handle: string;
  display_name: string | null;
  bio: string | null;
  created_at?: string;
};

/**
 * Read-only public profile stub — name, handle, bio, since-when.
 * No activity feed or counts (web `/u/[handle]` parity).
 */
export default function PublicProfileScreen() {
  const { handle: raw } = useLocalSearchParams<{ handle: string }>();
  const handle = (raw ?? "").toLowerCase();
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!handle || !/^[a-z0-9_]{3,24}$/.test(handle)) {
      setMissing(true);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setMissing(false);
    profileApi
      .byHandle(handle)
      .then((res) => {
        if (!alive) return;
        setProfile(res.profile);
      })
      .catch(() => {
        if (!alive) return;
        setMissing(true);
        setProfile(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [handle]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton fallback="/account" />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brass} />
        </View>
      </Screen>
    );
  }

  if (missing || !profile) {
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton fallback="/account" />
        </View>
        <EmptyState
          title={lang === "hi" ? "प्रोफ़ाइल नहीं मिली" : "Profile not found"}
          body={
            lang === "hi"
              ? "यह हैंडल सार्वजनिक नहीं है, या मौजूद नहीं है।"
              : "This handle isn’t public, or doesn’t exist."
          }
        />
      </Screen>
    );
  }

  const since = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(
        lang === "hi" ? "hi-IN" : "en-IN",
        { year: "numeric", month: "long" }
      )
    : null;

  return (
    <Screen testID="screen-public-profile">
      <View style={styles.top}>
        <BackButton fallback="/account" />
      </View>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {lang === "hi" ? "साधक" : "Seeker"}
      </Text>
      <Text variant="display" style={{ marginTop: spacing.sm }}>
        {profile.display_name || `@${profile.handle}`}
      </Text>
      <Text variant="muted" color={colors.textMuted} style={{ marginTop: 4 }}>
        @{profile.handle}
      </Text>
      {profile.bio ? (
        <Panel style={{ marginTop: spacing.xl }}>
          <Text variant="soft" style={styles.bio}>
            {profile.bio}
          </Text>
        </Panel>
      ) : null}
      {since ? (
        <Text
          variant="muted"
          color={colors.textMuted}
          style={{ marginTop: spacing.xl }}
        >
          {lang === "hi"
            ? `${since} से इस क्षेत्र में`
            : `Walking the field since ${since}`}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    minHeight: 48,
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bio: {
    lineHeight: 24,
  },
});
