import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { Button, Hairline } from "@/components/Button";
import { AppleSignInButton } from "@/components/AppleSignInButton";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

/** Which sign-in is in flight, so only that control reports as busy. */
export type AuthAction = "google" | "apple" | "email" | "password" | "guest";

type Props = {
  configured: boolean;
  pending: AuthAction | null;
  message: string | null;
  email: string;
  password: string;
  emailOpen: boolean;
  linkSent: boolean;
  emailCooldownSec: number;
  guestFailed: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onEmailOpen: () => void;
  onGoogle: () => void;
  onApple: () => void;
  onEmailSubmit: () => void;
  onPasswordSubmit: () => void;
  onGuest: () => void;
  onEnterAnyway: () => void;
};

export function OnboardingAuthStep({
  configured,
  pending,
  message,
  email,
  password,
  emailOpen,
  linkSent,
  emailCooldownSec,
  guestFailed,
  onEmailChange,
  onPasswordChange,
  onEmailOpen,
  onGoogle,
  onApple,
  onEmailSubmit,
  onPasswordSubmit,
  onGuest,
  onEnterAnyway,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [emailFocused, setEmailFocused] = useState(false);

  /** Anything running locks the rest, so two sign-ins cannot race. */
  const blocked = (self: AuthAction) => pending !== null && pending !== self;
  // Email path is active — demote Google so the field becomes the focus.
  const emailActive = emailOpen && !linkSent;

  return (
    <Rise>
      <Text
        variant="display"
        color={colors.onMedia}
        accessibilityRole="header"
        style={styles.title}
      >
        {t("onboardingAuthTitle")}
      </Text>
      <Text variant="soft" color={colors.onMediaMuted} style={styles.body}>
        {t("onboardingAuthBody")}
      </Text>

      {!configured ? (
        <Text variant="muted" style={[styles.body, { color: colors.danger }]}>
          {t("authNotConfigured")}
        </Text>
      ) : null}

      {linkSent ? (
        <Panel style={styles.sent}>
          <Text variant="soft" color={colors.brassSoft}>
            {t("magicLinkSent")}
          </Text>
          <Text variant="muted" style={styles.sentHint}>
            {t("magicLinkHint")}
          </Text>
          <Button
            label={t("onboardingGetStarted")}
            onPress={onEnterAnyway}
            style={styles.sentCta}
          />
        </Panel>
      ) : (
        <View style={styles.methods}>
          <AppleSignInButton
            testID="auth-apple"
            variant="white"
            disabled={blocked("apple")}
            onPress={onApple}
          />

          <Button
            testID="auth-google"
            label={t("signInGoogle")}
            variant={emailActive ? "ghost" : "primary"}
            loading={pending === "google"}
            disabled={blocked("google")}
            onPress={onGoogle}
          />

          {emailOpen ? (
            <View style={styles.emailBlock}>
              <Text
                variant="eyebrow"
                color={colors.brassSoft}
                style={styles.emailLabel}
              >
                {t("emailLabel")}
              </Text>
              <TextInput
                testID="auth-email-input"
                value={email}
                onChangeText={onEmailChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel={t("emailLabel")}
                placeholder={t("emailPlaceholder")}
                placeholderTextColor={colors.onMediaMuted}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                style={[
                  styles.input,
                  {
                    color: colors.onMedia,
                    borderColor:
                      emailFocused || emailActive ? colors.brass : colors.line,
                    backgroundColor: colors.inputBg,
                    borderWidth:
                      emailFocused || emailActive
                        ? 1.5
                        : StyleSheet.hairlineWidth * 2,
                  },
                ]}
              />
              <Text
                variant="eyebrow"
                color={colors.brassSoft}
                style={styles.emailLabel}
              >
                {t("passwordLabel")}
              </Text>
              <TextInput
                testID="auth-password-input"
                value={password}
                onChangeText={onPasswordChange}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
                accessibilityLabel={t("passwordLabel")}
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor={colors.onMediaMuted}
                style={[
                  styles.input,
                  {
                    color: colors.onMedia,
                    borderColor: colors.line,
                    backgroundColor: colors.inputBg,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                  },
                ]}
              />
              <Button
                testID="auth-password-submit"
                label={t("signInPassword")}
                variant={email.trim() && password ? "primary" : "ghost"}
                loading={pending === "password"}
                disabled={!email.trim() || !password || blocked("password")}
                onPress={onPasswordSubmit}
              />
              <Button
                label={
                  pending === "email"
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
                testID="auth-email-submit"
                variant="ghost"
                loading={pending === "email"}
                disabled={
                  !email.trim() || emailCooldownSec > 0 || blocked("email")
                }
                onPress={onEmailSubmit}
              />
            </View>
          ) : (
            <Button
              testID="auth-email-open"
              label={t("useEmailInstead")}
              variant="ghost"
              disabled={blocked("email")}
              onPress={onEmailOpen}
            />
          )}
        </View>
      )}

      {message ? (
        <Text variant="soft" style={[styles.message, { color: colors.danger }]}>
          {message}
        </Text>
      ) : null}

      {!linkSent ? (
        <>
          <View style={styles.divider}>
            <Hairline style={styles.dividerRule} />
            <Text variant="muted" color={colors.onMediaMuted}>
              {t("orDivider")}
            </Text>
            <Hairline style={styles.dividerRule} />
          </View>

          {/*
            Skipping sign-in is a different kind of act from choosing a sign-in
            method, so it stops being a fourth identical ghost button and
            becomes a link. Three stacked ghosts gave the reader no way to tell
            "another way in" from "no way in".
          */}
          <Pressable
            testID="onboarding-guest"
            onPress={guestFailed ? onEnterAnyway : onGuest}
            disabled={blocked("guest")}
            accessibilityRole="link"
            hitSlop={12}
            style={({ pressed }) => [
              styles.guest,
              { opacity: blocked("guest") ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            {pending === "guest" ? (
              <ActivityIndicator color={colors.brassSoft} />
            ) : (
              <Text
                variant="body"
                color={colors.brassSoft}
                style={styles.guestLabel}
              >
                {guestFailed
                  ? t("onboardingGetStarted")
                  : t("onboardingContinueGuest")}
              </Text>
            )}
          </Pressable>
        </>
      ) : null}

      {/* Chrome. Separated by a rule so it stops reading as another control. */}
      <Hairline style={styles.noteRule} />
      <Text variant="muted" color={colors.onMediaMuted}>
        {t("authPrivacyNote")}
      </Text>
    </Rise>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 0,
  },
  body: {
    marginTop: spacing.md,
    lineHeight: 24,
  },
  methods: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emailBlock: {
    gap: spacing.sm,
  },
  emailLabel: {
    marginTop: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: "Sora_400Regular",
  },
  sent: {
    marginTop: spacing.lg,
  },
  sentHint: {
    marginTop: spacing.sm,
  },
  sentCta: {
    marginTop: spacing.md,
  },
  message: {
    marginTop: spacing.md,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  dividerRule: {
    flex: 1,
  },
  guest: {
    marginTop: spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  guestLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
  },
  noteRule: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
