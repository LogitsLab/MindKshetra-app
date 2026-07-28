import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button, Hairline } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { BrandMark } from "@/components/BrandMark";
import { Rise } from "@/components/Rise";
import { userApi, votdApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

export default function AccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ auth_error?: string }>();
  const { colors, mode, toggle } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const {
    user,
    loading,
    configured,
    isAnonymous,
    isSignedIn,
    signInAnonymously,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    emailCooldownSec,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  const [votdConfigured, setVotdConfigured] = useState(false);
  const [votdEnabled, setVotdEnabled] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [votdEmailStatus, setVotdEmailStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");

  useEffect(() => {
    const authError = Array.isArray(params.auth_error)
      ? params.auth_error[0]
      : params.auth_error;
    if (!authError) return;
    if (authError === "otp_expired") setMessage(t("authLinkExpired"));
    else setMessage(t("authLinkFailed"));
    setEmailOpen(true);
  }, [params.auth_error, t]);
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

  useEffect(() => {
    if (!isSignedIn || isAnonymous) {
      setVotdConfigured(false);
      setVotdEnabled(true);
      return;
    }
    let alive = true;
    Promise.all([
      votdApi.status().catch(() => null),
      userApi.preferences().catch(() => null),
    ]).then(([status, prefs]) => {
      if (!alive) return;
      if (status) {
        setVotdConfigured(Boolean(status.configured));
        setVotdEnabled(Boolean(status.enabled));
      }
      if (typeof prefs?.votdEmailEnabled === "boolean") {
        setVotdEnabled(prefs.votdEmailEnabled);
      }
    });
    return () => {
      alive = false;
    };
  }, [isSignedIn, isAnonymous]);

  async function run(action: () => Promise<void>, ok?: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (ok) setMessage(ok);
    } catch (e) {
      const raw = (e as Error).message || "";
      if (
        raw === "EMAIL_QUOTA" ||
        raw === "RATE_LIMITED" ||
        /rate|too many|wait a minute/i.test(raw)
      ) {
        setMessage(t("authEmailQuota"));
      } else {
        setMessage(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onToggleVotdEmails() {
    const next = !votdEnabled;
    setPrefsBusy(true);
    setMessage(null);
    try {
      const data = await userApi.updatePreferences({ votdEmailEnabled: next });
      setVotdEnabled(Boolean(data.votdEmailEnabled));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setPrefsBusy(false);
    }
  }

  async function onEmailVotd() {
    if (!votdConfigured) {
      setMessage(t("emailVotdUnavailable"));
      return;
    }
    if (!votdEnabled) {
      setMessage(t("emailVotdDisabled"));
      return;
    }
    setVotdEmailStatus("sending");
    setMessage(null);
    try {
      await votdApi.send();
      setVotdEmailStatus("sent");
    } catch (e) {
      setMessage((e as Error).message);
      setVotdEmailStatus("idle");
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator
          color={colors.brass}
          style={{ marginTop: spacing.xl }}
        />
      </Screen>
    );
  }

  const showAuth = !isSignedIn || isAnonymous;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Rise>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            <BrandMark size={28} />
            <Text variant="eyebrow">{t("account")}</Text>
          </View>
          <Text variant="display" style={{ marginTop: spacing.sm }}>
            {isSignedIn && !isAnonymous ? t("welcomeBack") : t("signInTitle")}
          </Text>
          <Text variant="soft" style={{ marginTop: spacing.sm }}>
            {isAnonymous
              ? t("upgradeAccountBlurb")
              : isSignedIn
                ? user?.email ?? t("libraryBlurb")
                : t("accountSignInBlurb")}
          </Text>
        </Rise>

        {!configured ? (
          <Text
            variant="muted"
            style={{ marginTop: spacing.md, color: colors.danger }}
          >
            {t("authNotConfigured")}
          </Text>
        ) : null}

        {isSignedIn && !isAnonymous && streak > 0 ? (
          <Panel style={{ marginTop: spacing.lg }}>
            <Text variant="eyebrow">{t("streakLabel")}</Text>
            <Text variant="title" style={{ marginTop: spacing.xs }}>
              {streak} {t("streakDays")}
            </Text>
          </Panel>
        ) : null}

        <Hairline style={{ marginVertical: spacing.lg }} />

        {showAuth ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t("signInGoogle")}
              variant="primary"
              loading={busy}
              onPress={() => void run(signInWithGoogle)}
            />

            {!user ? (
              <Button
                label={t("guest")}
                variant="ghost"
                loading={busy}
                onPress={() => void run(signInAnonymously)}
              />
            ) : null}

            <Text
              variant="muted"
              style={{ textAlign: "center", marginVertical: spacing.sm }}
            >
              {t("orDivider")}
            </Text>

            {linkSent ? (
              <Panel>
                <Text variant="soft" color={colors.brassSoft}>
                  {t("magicLinkSent")}
                </Text>
                <Text variant="muted" style={{ marginTop: spacing.sm }}>
                  {t("magicLinkHint")}
                </Text>
                {email ? (
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {email}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => {
                    setLinkSent(false);
                    setEmail("");
                    setMessage(null);
                    setEmailOpen(true);
                  }}
                  style={{ marginTop: spacing.md }}
                >
                  <Text variant="muted" color={colors.brassSoft}>
                    {t("useDifferentEmail")}
                  </Text>
                </Pressable>
              </Panel>
            ) : emailOpen ? (
              <>
                <Text variant="eyebrow">{t("emailLabel")}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  keyboardType="email-address"
                  textContentType="emailAddress"
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
                  label={
                    busy
                      ? t("sendingLink")
                      : emailCooldownSec > 0
                        ? t("authCooldown").replace(
                            "{seconds}",
                            emailCooldownSec >= 60
                              ? `${Math.ceil(emailCooldownSec / 60)}m`
                              : String(emailCooldownSec)
                          )
                        : t("signInEmail")
                  }
                  variant="ghost"
                  loading={busy}
                  disabled={!email.trim() || emailCooldownSec > 0}
                  onPress={() =>
                    void run(async () => {
                      await signInWithEmail(email.trim());
                      setLinkSent(true);
                    }, t("magicLinkSent"))
                  }
                />
                {emailCooldownSec > 0 && !linkSent ? (
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {emailCooldownSec >= 120
                      ? t("authEmailQuota")
                      : t("authRateLimited")}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => setEmailOpen(false)}
                  style={{ paddingVertical: spacing.xs }}
                >
                  <Text
                    variant="muted"
                    style={{ textAlign: "center", fontSize: 12 }}
                  >
                    {t("hideEmailSignIn")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Button
                label={t("useEmailInstead")}
                variant="ghost"
                onPress={() => setEmailOpen(true)}
              />
            )}

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
            style={{
              marginTop: spacing.md,
              color:
                message === t("authLinkExpired") ||
                message === t("authLinkFailed")
                  ? colors.danger
                  : colors.brassSoft,
            }}
          >
            {message}
          </Text>
        ) : null}

        {/* Verse email — signed-in members only (matches web) */}
        {isSignedIn && !isAnonymous ? (
          <>
            <Hairline style={{ marginVertical: spacing.lg }} />
            <Text variant="eyebrow">{t("preferencesTitle")}</Text>
            <Text variant="soft" style={{ marginTop: spacing.xs }}>
              {t("preferencesBlurb")}
            </Text>
            <Panel style={{ marginTop: spacing.md }}>
              <View style={styles.votdRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text variant="body">{t("votdEmailToggle")}</Text>
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {t("votdEmailToggleBlurb")}
                  </Text>
                  {!votdConfigured ? (
                    <Text
                      variant="muted"
                      style={{ marginTop: spacing.xs, opacity: 0.8 }}
                    >
                      {t("votdEmailNotReady")}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: votdEnabled }}
                  disabled={prefsBusy}
                  onPress={() => void onToggleVotdEmails()}
                  style={[
                    styles.switch,
                    {
                      borderColor: votdEnabled ? colors.brass : colors.line,
                      backgroundColor: votdEnabled
                        ? "rgba(201,162,39,0.25)"
                        : colors.surface,
                      opacity: prefsBusy ? 0.5 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.switchKnob,
                      {
                        backgroundColor: colors.brassSoft,
                        alignSelf: votdEnabled ? "flex-end" : "flex-start",
                        opacity: votdEnabled ? 1 : 0.5,
                      },
                    ]}
                  />
                </Pressable>
              </View>
              {votdConfigured && votdEnabled ? (
                <Pressable
                  onPress={() => void onEmailVotd()}
                  disabled={votdEmailStatus === "sending"}
                  style={{ marginTop: spacing.md }}
                >
                  <Text variant="muted" color={colors.brassSoft}>
                    {votdEmailStatus === "sending"
                      ? t("emailVotdSending")
                      : votdEmailStatus === "sent"
                        ? t("emailVotdSent")
                        : t("emailVotd")}
                  </Text>
                </Pressable>
              ) : null}
            </Panel>
          </>
        ) : null}

        <Hairline style={{ marginVertical: spacing.lg }} />

        <Text variant="eyebrow">
          {lang === "hi" ? "दिखावट" : "Appearance"}
        </Text>
        <View style={styles.row}>
          <Pressable
            onPress={toggle}
            style={[
              styles.chip,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
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
            style={[
              styles.chip,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            <Text variant="muted">
              {lang === "en" ? "EN → हिं" : "हिं → EN"}
            </Text>
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
  votdRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  switch: {
    width: 56,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: "center",
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});
