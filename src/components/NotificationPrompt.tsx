import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { shouldShowPrompt } from "@/notifications/logic";
import {
  getPushPermission,
  registerPush,
  requestPushPermission,
} from "@/notifications/push";
import { getNotifPromptState, setNotifPromptState } from "@/storage/local";
import { spacing } from "@/theme/tokens";

/**
 * Whether the pre-permission sheet may appear right now. Called after the
 * first meaningful action succeeds (verse done, favorite added) — never on
 * launch. True only when the OS has never been asked AND the decline
 * history allows it (14-day cooldown, gone forever after two declines).
 */
export async function maybeShowNotificationPrompt(): Promise<boolean> {
  try {
    if ((await getPushPermission()) !== "undetermined") return false;
    const state = await getNotifPromptState();
    return shouldShowPrompt(state, Date.now());
  } catch {
    return false;
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * The pre-permission sheet: one calm ask in the app's own voice before the
 * OS dialog ever appears. Accept is the ONLY place the OS prompt fires from
 * this flow; "Not now" stamps the decline history and leaves quietly.
 */
export function NotificationPrompt({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      const granted = await requestPushPermission();
      if (granted) await registerPush();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const decline = async () => {
    try {
      const state = await getNotifPromptState();
      await setNotifPromptState({
        lastPromptAt: Date.now(),
        declineCount: state.declineCount + 1,
      });
    } catch {
      /* the sheet still closes */
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => void decline()}
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.scrim }]}
        onPress={() => void decline()}
      >
        {/* Swallow taps on the sheet so only the scrim dismisses. */}
        <Pressable onPress={() => undefined}>
          <Panel strong style={styles.sheet}>
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("notifTitle")}
            </Text>
            <Text variant="title" style={{ marginTop: spacing.sm }}>
              {t("notifPromptTitle")}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {t("notifPromptBody")}
            </Text>
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button
                label={t("notifPromptAccept")}
                loading={busy}
                onPress={() => void accept()}
              />
              <Button
                label={t("notifPromptLater")}
                variant="ghost"
                disabled={busy}
                onPress={() => void decline()}
              />
            </View>
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  sheet: {
    paddingBottom: spacing.lg,
  },
});
