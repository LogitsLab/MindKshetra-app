import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { Button, Hairline } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";

/** Which sign-in is in flight, so only that control reports as busy. */
export type AuthAction = "google" | "email" | "guest";

type Props = {
  configured: boolean;
  pending: AuthAction | null;
  message: string | null;
  email: string;
  emailOpen: boolean;
  linkSent: boolean;
  emailCooldownSec: number;
  guestFailed: boolean;
  onEmailChange: (value: string) => void;
  onEmailOpen: () => void;
  onGoogle: () => void;
  onEmailSubmit: () => void;
  onGuest: () => void;
  onEnterAnyway: () => void;
};

export function OnboardingAuthStep({
  configured,
  pending,
  message,
  email,
  emailOpen,
  linkSent,
  emailCooldownSec,
  guestFailed,
  onEmailChange,
  onEmailOpen,
  onGoogle,
  onEmailSubmit,
  onGuest,
  onEnterAnyway,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  /** Anything running locks the rest, so two sign-ins cannot race. */
  const blocked = (self: AuthAction) => pending !== null && pending !== self;

  return (
    <Rise>
      {/*
        The step is about saving your own data, so it opens under the brand
        mark. It previously opened on Madhav's portrait laid over the Madhav
        path photograph — the same subject twice, and it borrowed the guide's
        identity for an account system. DESIGN.md is explicit that the portrait
        means Madhav specifically.
      */}
      <View style={styles.brandRow}>
        <BrandMark size={22} />
        <Text variant="eyebrow" color={colors.brassSoft}>
          {t("onboardingAuthEyebrow")}
        </Text>
      </View>

      <Text variant="display" accessibilityRole="header" style={styles.title}>
        {t("onboardingAuthTitle")}
      </Text>
      <Text variant="soft" style={styles.body}>
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
          <Button
            label={t("signInGoogle")}
            variant="primary"
            loading={pending === "google"}
            disabled={blocked("google")}
            onPress={onGoogle}
          />

          {emailOpen ? (
            <View style={styles.emailBlock}>
              <Text variant="eyebrow" style={styles.emailLabel}>
                {t("emailLabel")}
              </Text>
              <TextInput
                value={email}
                onChangeText={onEmailChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                keyboardType="email-address"
                textContentType="emailAddress"
                accessibilityLabel={t("emailLabel")}
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
            <Text variant="muted">{t("orDivider")}</Text>
            <Hairline style={styles.dividerRule} />
          </View>

          {/*
            Skipping sign-in is a different kind of act from choosing a sign-in
            method, so it stops being a fourth identical ghost button and
            becomes a link. Three stacked ghosts gave the reader no way to tell
            "another way in" from "no way in".
          */}
          <Pressable
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
      <Text variant="muted">{t("authPrivacyNote")}</Text>
    </Rise>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
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
