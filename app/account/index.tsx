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
import { BRAND_NAME } from "@/components/BrandWordmark";
import { PracticeMarks } from "@/components/PracticeMarks";
import {
  notificationPrefsApi,
  profileApi,
  userApi,
  votdApi,
} from "@/api/endpoints";
import {
  getPushPermission,
  pushSupported,
  registerPush,
  requestPushPermission,
  unregisterPush,
  type PushPermission,
} from "@/notifications/push";
import { clearUserLocalState, getStoredPushToken } from "@/storage/local";
import { useAuth } from "@/context/AuthContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTextScale, type TextScaleId } from "@/context/TextScaleContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { getAppVersionLabel } from "@/utils/appVersion";

export default function AccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ auth_error?: string }>();
  const { colors, mode, toggle } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { scale, setScale } = useTextScale();
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
  const { resetComplete } = useOnboarding();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [deleteStage, setDeleteStage] = useState<
    "idle" | "confirming" | "deleting"
  >("idle");

  const [votdConfigured, setVotdConfigured] = useState(false);
  const [votdTestingMode, setVotdTestingMode] = useState(false);
  const [votdEnabled, setVotdEnabled] = useState(true);
  const [prefsBusy, setPrefsBusy] = useState(false);

  // Push notifications: device state (permission + registered token) plus
  // the server's notification-preferences row for signed-in members.
  const pushAvailable = pushSupported();
  const [pushPermission, setPushPermission] =
    useState<PushPermission>("undetermined");
  const [pushRegistered, setPushRegistered] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifDailyVerse, setNotifDailyVerse] = useState(false);
  const [notifStreakReminder, setNotifStreakReminder] = useState(false);
  const [sendHourLocal, setSendHourLocal] = useState(8);
  const [pushBusy, setPushBusy] = useState(false);
  const [votdEmailStatus, setVotdEmailStatus] = useState<
    "idle" | "sending" | "sent"
  >("idle");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => {
    if (!isSignedIn || isAnonymous) {
      setHandle("");
      setDisplayName("");
      setBio("");
      return;
    }
    let alive = true;
    void profileApi
      .get()
      .then((data) => {
        if (!alive || !data.profile) return;
        setHandle(data.profile.handle ?? "");
        setDisplayName(data.profile.display_name ?? "");
        setBio(data.profile.bio ?? "");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isSignedIn, isAnonymous]);

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
      setVotdTestingMode(false);
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
        setVotdTestingMode(Boolean(status.testingMode));
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

  // Device-level push state — read for everyone, guests included, since
  // token registration works anonymously.
  useEffect(() => {
    let alive = true;
    void Promise.all([getPushPermission(), getStoredPushToken()]).then(
      ([permission, token]) => {
        if (!alive) return;
        setPushPermission(permission);
        setPushRegistered(Boolean(token) && permission === "granted");
      }
    );
    return () => {
      alive = false;
    };
  }, []);

  // Server notification preferences — members only; the server creates
  // defaults on first read.
  useEffect(() => {
    if (!isSignedIn || isAnonymous) {
      setPushEnabled(true);
      setNotifDailyVerse(false);
      setNotifStreakReminder(false);
      setSendHourLocal(8);
      return;
    }
    let alive = true;
    notificationPrefsApi
      .get()
      .then((prefs) => {
        if (!alive) return;
        setPushEnabled(prefs.pushEnabled);
        setNotifDailyVerse(prefs.dailyVerse);
        setNotifStreakReminder(prefs.streakReminder);
        setSendHourLocal(prefs.sendHourLocal);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isSignedIn, isAnonymous]);

  async function run(action: () => Promise<boolean | void>, ok?: string) {
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

  const isMember = isSignedIn && !isAnonymous;
  const pushMasterOn = pushRegistered && (!isMember || pushEnabled);

  async function patchNotifPrefs(
    body: Partial<{
      pushEnabled: boolean;
      dailyVerse: boolean;
      streakReminder: boolean;
      sendHourLocal: number;
    }>
  ) {
    setPrefsBusy(true);
    setMessage(null);
    try {
      const data = await notificationPrefsApi.update(body);
      setPushEnabled(data.pushEnabled);
      setNotifDailyVerse(data.dailyVerse);
      setNotifStreakReminder(data.streakReminder);
      setSendHourLocal(data.sendHourLocal);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setPrefsBusy(false);
    }
  }

  /**
   * Master toggle. Off: the device token is disabled on the server and, for
   * members, pushEnabled goes false. On: OS permission (asking only if it
   * was never asked or was re-enabled), token registration, pushEnabled true.
   */
  async function onTogglePushMaster() {
    if (pushBusy) return;
    setPushBusy(true);
    setMessage(null);
    try {
      if (pushMasterOn) {
        await unregisterPush();
        setPushRegistered(false);
        if (isMember) {
          try {
            const data = await notificationPrefsApi.update({
              pushEnabled: false,
            });
            setPushEnabled(data.pushEnabled);
          } catch {
            setPushEnabled(false);
          }
        }
        return;
      }

      let permission = await getPushPermission();
      if (permission !== "granted") {
        permission = (await requestPushPermission()) ? "granted" : "denied";
      }
      setPushPermission(permission);
      if (permission !== "granted") {
        setMessage(t("notifMasterDenied"));
        return;
      }

      const token = await registerPush();
      if (!token) {
        setMessage(t("notifUnavailable"));
        return;
      }
      setPushRegistered(true);
      if (isMember) {
        try {
          const data = await notificationPrefsApi.update({
            pushEnabled: true,
          });
          setPushEnabled(data.pushEnabled);
        } catch {
          setPushEnabled(true);
        }
      }
    } finally {
      setPushBusy(false);
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

  async function onSaveProfile() {
    setProfileBusy(true);
    setMessage(null);
    try {
      await profileApi.save({
        handle: handle.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setMessage(t("profileSaved"));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setProfileBusy(false);
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

        {isSignedIn && !isAnonymous ? (
          <Panel style={{ marginTop: spacing.lg }}>
            <Text variant="eyebrow">{t("profileSectionTitle")}</Text>
            <Text variant="muted" style={{ marginTop: spacing.xs }}>
              {t("profileSectionBody")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.md }}>
              {t("profileHandle")}
            </Text>
            <TextInput
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="your_name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: colors.line,
                  color: colors.text,
                  marginTop: spacing.xs,
                },
              ]}
            />
            <Text variant="muted" style={{ marginTop: spacing.md }}>
              {t("profileDisplayName")}
            </Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: colors.line,
                  color: colors.text,
                  marginTop: spacing.xs,
                },
              ]}
            />
            <Text variant="muted" style={{ marginTop: spacing.md }}>
              {t("profileBio")}
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              multiline
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: colors.line,
                  color: colors.text,
                  marginTop: spacing.xs,
                  minHeight: 72,
                },
              ]}
            />
            <View style={{ marginTop: spacing.md }}>
              <Button
                label={profileBusy ? t("medSaving") : t("profileSave")}
                onPress={() => void onSaveProfile()}
                disabled={profileBusy || handle.trim().length < 3}
              />
            </View>
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
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button
              label={t("myReflections")}
              variant="ghost"
              onPress={() => router.push("/account/reflections")}
            />
            <Button
              label={lang === "hi" ? "उपलब्धियाँ" : "Achievements"}
              variant="ghost"
              onPress={() => router.push("/account/achievements")}
            />
            <Button
              label={lang === "hi" ? "प्रगति" : "Progress"}
              variant="ghost"
              onPress={() => router.push("/account/progress")}
            />
            <Button
              label={lang === "hi" ? "जर्नल" : "Journal"}
              variant="ghost"
              onPress={() => router.push("/journal")}
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

            {deleteStage === "idle" ? (
              <Pressable
                onPress={() => setDeleteStage("confirming")}
                style={{ paddingVertical: spacing.xs }}
              >
                <Text
                  variant="muted"
                  style={{ textAlign: "center", fontSize: 12 }}
                >
                  {t("deleteAccount")}
                </Text>
              </Pressable>
            ) : (
              <Panel
                style={{
                  borderColor: colors.danger,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                }}
              >
                <Text variant="soft">{t("deleteAccountBlurb")}</Text>
                <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                  <Button
                    label={t("deleteAccountConfirm")}
                    variant="danger"
                    loading={deleteStage === "deleting"}
                    onPress={() =>
                      void (async () => {
                        setDeleteStage("deleting");
                        try {
                          await userApi.deleteAccount();
                          await signOut();
                          await clearUserLocalState();
                          router.replace("/");
                        } catch {
                          setMessage(t("deleteAccountFailed"));
                          setDeleteStage("idle");
                        }
                      })()
                    }
                  />
                  <Button
                    label={t("deleteAccountCancel")}
                    variant="ghost"
                    disabled={deleteStage === "deleting"}
                    onPress={() => setDeleteStage("idle")}
                  />
                </View>
              </Panel>
            )}
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
                  ) : votdTestingMode ? (
                    <Text
                      variant="muted"
                      style={{ marginTop: spacing.xs, opacity: 0.8 }}
                    >
                      {t("votdEmailTestingMode")}
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

        {/* Notifications — the master switch is device-level and works for
            guests too (tokens upsert anonymously); category choices and the
            delivery hour live on the account. */}
        <Text variant="eyebrow">{t("notifTitle")}</Text>
        <Text variant="soft" style={{ marginTop: spacing.xs }}>
          {t("notifBlurb")}
        </Text>
        <Panel style={{ marginTop: spacing.md }}>
          <View style={styles.votdRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text variant="body">{t("notifMaster")}</Text>
              <Text variant="muted" style={{ marginTop: spacing.xs }}>
                {t("notifMasterBlurb")}
              </Text>
              {!pushAvailable ? (
                <Text
                  variant="muted"
                  style={{ marginTop: spacing.xs, opacity: 0.8 }}
                >
                  {t("notifUnavailable")}
                </Text>
              ) : pushPermission === "denied" && !pushMasterOn ? (
                <Text
                  variant="muted"
                  style={{ marginTop: spacing.xs, opacity: 0.8 }}
                >
                  {t("notifMasterDenied")}
                </Text>
              ) : null}
            </View>
            <ToggleSwitch
              checked={pushMasterOn}
              disabled={pushBusy || !pushAvailable}
              onPress={() => void onTogglePushMaster()}
            />
          </View>

          <Hairline style={{ marginVertical: spacing.md }} />

          {isMember ? (
            <>
              <View style={styles.votdRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text variant="body">{t("notifDailyVerse")}</Text>
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {t("notifDailyVerseBlurb")}
                  </Text>
                </View>
                <ToggleSwitch
                  checked={notifDailyVerse}
                  disabled={prefsBusy}
                  onPress={() =>
                    void patchNotifPrefs({ dailyVerse: !notifDailyVerse })
                  }
                />
              </View>

              {notifDailyVerse ? (
                <View style={{ marginTop: spacing.md }}>
                  <Text variant="muted">{t("notifDailyVerseHour")}</Text>
                  <Text
                    variant="muted"
                    style={{ marginTop: spacing.xs, opacity: 0.8 }}
                  >
                    {t("notifDailyVerseHourBlurb")}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.hourRow}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 4).map((hour) => {
                      const active = sendHourLocal === hour;
                      return (
                        <Pressable
                          key={hour}
                          disabled={prefsBusy}
                          onPress={() =>
                            void patchNotifPrefs({ sendHourLocal: hour })
                          }
                          style={[
                            styles.hourChip,
                            {
                              borderColor: active ? colors.brass : colors.line,
                              backgroundColor: active
                                ? "rgba(201,162,39,0.18)"
                                : colors.surface,
                              opacity: prefsBusy ? 0.5 : 1,
                            },
                          ]}
                        >
                          <Text
                            variant="muted"
                            style={{
                              color: active
                                ? colors.brassSoft
                                : colors.textMuted,
                            }}
                          >
                            {hour}:00
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              <Hairline style={{ marginVertical: spacing.md }} />

              <View style={styles.votdRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <Text variant="body">{t("notifStreakReminder")}</Text>
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {t("notifStreakReminderBlurb")}
                  </Text>
                </View>
                <ToggleSwitch
                  checked={notifStreakReminder}
                  disabled={prefsBusy}
                  onPress={() =>
                    void patchNotifPrefs({
                      streakReminder: !notifStreakReminder,
                    })
                  }
                />
              </View>
            </>
          ) : (
            <Text variant="muted">{t("notifGuestRow")}</Text>
          )}
        </Panel>

        <PracticeMarks />

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

        <Text variant="eyebrow" style={{ marginTop: spacing.lg }}>
          {t("textSizeLabel")}
        </Text>
        <Text variant="muted" style={{ marginTop: spacing.xs }}>
          {t("textSizeBlurb")}
        </Text>
        <View style={styles.row}>
          {(
            [
              ["sm", t("textSizeSmall")],
              ["md", t("textSizeMedium")],
              ["lg", t("textSizeLarge")],
            ] as [TextScaleId, string][]
          ).map(([id, label]) => {
            const active = scale === id;
            return (
              <Pressable
                key={id}
                onPress={() => setScale(id)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.brass : colors.line,
                    backgroundColor: active
                      ? "rgba(201,162,39,0.18)"
                      : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="muted"
                  style={{ color: active ? colors.brassSoft : colors.textMuted }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push("/privacy")}
          style={{ marginTop: spacing.xl }}
        >
          <Text variant="muted" style={{ textAlign: "center" }}>
            {lang === "hi" ? "गोपनीयता नीति" : "Privacy policy"}
          </Text>
        </Pressable>

        <Text
          variant="muted"
          style={{
            marginTop: spacing.md,
            textAlign: "center",
            fontSize: 12,
            lineHeight: 18,
            opacity: 0.75,
          }}
        >
          {BRAND_NAME}
          {"\n"}
          {getAppVersionLabel()}
        </Text>

        {__DEV__ ? (
          <Pressable
            onPress={() => {
              void resetComplete().then(() => router.replace("/onboarding"));
            }}
            style={{ marginTop: spacing.md }}
          >
            <Text variant="muted" style={{ textAlign: "center", opacity: 0.7 }}>
              Replay onboarding (dev)
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** The app's quiet two-state switch, shared by the notification rows. */
function ToggleSwitch({
  checked,
  disabled,
  onPress,
}: {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? t("notifOn") : t("notifOff")}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.switch,
        {
          borderColor: checked ? colors.brass : colors.line,
          backgroundColor: checked
            ? "rgba(201,162,39,0.25)"
            : colors.surface,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.switchKnob,
          {
            backgroundColor: colors.brassSoft,
            alignSelf: checked ? "flex-end" : "flex-start",
            opacity: checked ? 1 : 0.5,
          },
        ]}
      />
    </Pressable>
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
  hourRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingRight: spacing.md,
  },
  hourChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
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
