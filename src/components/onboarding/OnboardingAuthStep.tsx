import React from "react";
import {
  Image,
  ImageBackground,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { Rise } from "@/components/Rise";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";

type Props = {
  configured: boolean;
  busy: boolean;
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
  busy,
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

  return (
    <Rise>
      <View style={[styles.heroBand, { borderColor: colors.line }]}>
        <ImageBackground
          source={images.pathMadhav}
          style={styles.heroBandBg}
          imageStyle={styles.heroBandImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={["rgba(7,9,15,0.2)", "rgba(7,9,15,0.88)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroBandInner}>
            <Image
              source={images.madhavPortrait}
              style={[styles.portrait, { borderColor: colors.brass }]}
            />
            <View style={{ flex: 1 }}>
              <Text variant="eyebrow" color={colors.brassSoft}>
                {t("onboardingAuthEyebrow")}
              </Text>
              <Text variant="title" color={colors.onMedia} style={styles.heroTitle}>
                {t("onboardingAuthTitle")}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <Text variant="soft" style={styles.body}>
        {t("onboardingAuthBody")}
      </Text>

      {!configured ? (
        <Text variant="muted" style={{ marginTop: spacing.md, color: colors.danger }}>
          {t("authNotConfigured")}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {linkSent ? (
          <Panel>
            <Text variant="soft" color={colors.brassSoft}>
              {t("magicLinkSent")}
            </Text>
            <Text variant="muted" style={{ marginTop: spacing.sm }}>
              {t("magicLinkHint")}
            </Text>
            <Button
              label={t("onboardingGetStarted")}
              onPress={onEnterAnyway}
              style={{ marginTop: spacing.md }}
            />
          </Panel>
        ) : (
          <>
            <Button label={t("signInGoogle")} loading={busy} onPress={onGoogle} />

            {emailOpen ? (
              <>
                <Text variant="eyebrow">{t("emailLabel")}</Text>
                <TextInput
                  value={email}
                  onChangeText={onEmailChange}
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
                  onPress={onEmailSubmit}
                />
              </>
            ) : (
              <Button
                label={t("useEmailInstead")}
                variant="ghost"
                onPress={onEmailOpen}
              />
            )}

            <Text
              variant="muted"
              style={{ textAlign: "center", marginVertical: spacing.xs }}
            >
              {t("orDivider")}
            </Text>

            <Button
              label={t("onboardingContinueGuest")}
              variant="ghost"
              loading={busy}
              onPress={onGuest}
            />

            {guestFailed ? (
              <Button
                label={t("onboardingGetStarted")}
                variant="ghost"
                onPress={onEnterAnyway}
              />
            ) : null}
          </>
        )}

        <Text variant="muted">{t("authPrivacyNote")}</Text>
      </View>

      {message ? (
        <Text variant="soft" style={{ marginTop: spacing.md, color: colors.danger }}>
          {message}
        </Text>
      ) : null}
    </Rise>
  );
}

const styles = StyleSheet.create({
  heroBand: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    marginBottom: spacing.md,
  },
  heroBandBg: {
    minHeight: 120,
    justifyContent: "flex-end",
  },
  heroBandImage: {
    opacity: 0.9,
  },
  heroBandInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  portrait: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  heroTitle: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    lineHeight: 24,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontFamily: "Sora_400Regular",
  },
});
