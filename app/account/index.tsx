import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button, Hairline } from "@/components/Button";
import { userApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export default function AccountScreen() {
  const router = useRouter();
  const { colors, mode, toggle } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const {
    user,
    loading,
    configured,
    isAnonymous,
    isSignedIn,
    signInAnonymously,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signOut,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!isSignedIn) {
      setStreak(0);
      return;
    }
    userApi
      .streak()
      .then((s) => setStreak(s.current ?? 0))
      .catch(() => undefined);
  }, [isSignedIn]);

  async function run(action: () => Promise<void>, ok?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (ok) setMessage(ok);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="eyebrow">{t("account")}</Text>
        <Text variant="display" style={{ marginTop: spacing.sm }}>
          {isSignedIn ? t("welcomeBack") : t("signInTitle")}
        </Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {isAnonymous
            ? t("upgradeAccountBlurb")
            : isSignedIn
              ? user?.email ?? t("libraryBlurb")
              : t("accountSignInBlurb")}
        </Text>

        {!configured ? (
          <Text variant="muted" style={{ marginTop: spacing.md, color: colors.danger }}>
            {t("authNotConfigured")}
          </Text>
        ) : null}

        {isSignedIn && streak > 0 ? (
          <View
            style={[
              styles.streak,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
            <Text variant="eyebrow">{t("streakLabel")}</Text>
            <Text variant="title" style={{ marginTop: spacing.xs }}>
              {streak} {t("streakDays")}
            </Text>
          </View>
        ) : null}

        <Hairline style={{ marginVertical: spacing.lg }} />

        {!isSignedIn || isAnonymous ? (
          <View style={{ gap: spacing.sm }}>
            {!user ? (
              <Button
                label={t("guest")}
                variant="ghost"
                loading={busy}
                onPress={() => void run(signInAnonymously)}
              />
            ) : null}
            <Button
              label={t("signInGoogle")}
              loading={busy}
              onPress={() => void run(signInWithGoogle)}
            />
            {Platform.OS === "ios" ? (
              <Button
                label={lang === "hi" ? "Apple से जारी रखें" : "Continue with Apple"}
                variant="ghost"
                loading={busy}
                onPress={() => void run(signInWithApple)}
              />
            ) : null}
            <Text variant="muted" style={{ textAlign: "center", marginTop: spacing.sm }}>
              {t("orDivider")}
            </Text>
            <Text variant="eyebrow">{t("emailLabel")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t("emailPlaceholder")}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.line,
                  backgroundColor: colors.inputBg,
                },
              ]}
            />
            <Button
              label={t("signInEmail")}
              loading={busy}
              onPress={() =>
                void run(
                  () => signInWithEmail(email.trim()),
                  t("magicLinkSent")
                )
              }
            />
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("authPrivacyNote")}
            </Text>
            {user ? (
              <Button
                label={t("signOut")}
                variant="danger"
                loading={busy}
                onPress={() => void run(signOut)}
              />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t("myReflections")}
              variant="ghost"
              onPress={() => router.push("/account/reflections")}
            />
            <Button
              label={t("favorites")}
              variant="ghost"
              onPress={() => router.push("/favorites")}
            />
            <Button
              label={t("exportData")}
              variant="ghost"
              loading={busy}
              onPress={() =>
                void run(async () => {
                  const data = await userApi.exportData();
                  await Share.share({
                    message: JSON.stringify(data, null, 2),
                    title: "MindKshetra export",
                  });
                })
              }
            />
            <Button
              label={t("signOut")}
              variant="danger"
              loading={busy}
              onPress={() => void run(signOut)}
            />
          </View>
        )}

        {message ? (
          <Text
            variant="soft"
            style={{ marginTop: spacing.md, color: colors.brassSoft }}
          >
            {message}
          </Text>
        ) : null}

        <Hairline style={{ marginVertical: spacing.lg }} />

        <Text variant="eyebrow">{t("preferencesTitle")}</Text>
        <View style={styles.row}>
          <Pressable
            onPress={toggle}
            style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Text variant="muted">
              {lang === "hi"
                ? mode === "dark"
                  ? "गहरा"
                  : "हल्का"
                : mode === "dark"
                  ? "Dark"
                  : "Light"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLang(lang === "en" ? "hi" : "en")}
            style={[styles.chip, { borderColor: colors.line, backgroundColor: colors.surface }]}
          >
            <Text variant="muted">{lang === "en" ? "EN → हिं" : "हिं → EN"}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/privacy")}
          style={{ marginTop: spacing.xl }}
        >
          <Text variant="muted" style={{ textAlign: "center" }}>
            {lang === "hi" ? "गोपनीयता नीति" : "Privacy policy"}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streak: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: "Sora_400Regular",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
