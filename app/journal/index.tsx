import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Panel } from "@/components/Panel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { userApi } from "@/api/endpoints";
import { spacing, radii } from "@/theme/tokens";

type KindFilter = "all" | "reflection" | "gratitude" | "insight" | "verse";

export default function JournalScreen() {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const { isSignedIn, isAnonymous } = useAuth();
  const L = lang === "hi" ? "hi" : "en";
  const [filter, setFilter] = useState<KindFilter>("all");
  const [entries, setEntries] = useState<
    Array<{ id: string | number; reflection: string; kind?: string; created_at?: string }>
  >([]);
  const [text, setText] = useState("");
  const [writeKind, setWriteKind] = useState<"reflection" | "gratitude" | "insight">(
    "reflection"
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(async () => {
    if (!isSignedIn || isAnonymous) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const res = await userApi.journal(filter === "all" ? undefined : filter);
      setEntries(res.entries ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, isAnonymous, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!text.trim()) return;
    setBusy(true);
    setSaveError(false);
    try {
      await userApi.addJournal(text.trim(), { kind: writeKind });
      setText("");
      await load();
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text variant="display">{L === "hi" ? "जर्नल" : "Journal"}</Text>
        <Text variant="soft" style={{ marginTop: spacing.sm }}>
          {L === "hi"
            ? "निजी चिंतन और कृतज्ञता।"
            : "Private reflections and gratitude."}
        </Text>

        {!isSignedIn || isAnonymous ? (
          <Text variant="soft" style={{ marginTop: spacing.lg }}>
            {L === "hi"
              ? "जर्नल सहेजने के लिए साइन इन करें।"
              : "Sign in to keep a journal."}
          </Text>
        ) : (
          <>
            <View style={styles.chips}>
              {(["reflection", "gratitude", "insight"] as const).map((k) => (
                <Pressable
                  key={k}
                  accessibilityRole="radio"
                  accessibilityLabel={k}
                  accessibilityState={{ selected: writeKind === k }}
                  onPress={() => setWriteKind(k)}
                  style={[
                    styles.chip,
                    {
                      borderColor: writeKind === k ? colors.brass : colors.line,
                      backgroundColor: colors.field,
                    },
                  ]}
                >
                  <Text variant="muted">{k}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              accessibilityLabel={L === "hi" ? "जर्नल प्रविष्टि" : "Journal entry"}
              placeholder={L === "hi" ? "आज की पंक्ति…" : "An honest line…"}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.line,
                  backgroundColor: colors.field,
                },
              ]}
            />
            {saveError ? (
              <Text
                accessibilityRole="alert"
                variant="soft"
                color={colors.danger}
                style={{ marginTop: spacing.sm }}
              >
                {L === "hi"
                  ? "प्रविष्टि सहेजी नहीं गई। कनेक्शन जाँचें और फिर कोशिश करें।"
                  : "Entry was not saved. Check your connection and retry."}
              </Text>
            ) : null}
            <Button
              label={L === "hi" ? "सहेजें" : "Save entry"}
              loading={busy}
              onPress={() => void save()}
              style={{ marginTop: spacing.md }}
            />

            <View style={[styles.chips, { marginTop: spacing.xl }]}>
              {(["all", "reflection", "gratitude", "insight", "verse"] as KindFilter[]).map(
                (k) => (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityLabel={k}
                    accessibilityState={{ selected: filter === k }}
                    onPress={() => setFilter(k)}
                    style={[
                      styles.chip,
                      {
                        borderColor: filter === k ? colors.brass : colors.line,
                        backgroundColor: colors.field,
                      },
                    ]}
                  >
                    <Text variant="muted">{k}</Text>
                  </Pressable>
                )
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.lg }} />
            ) : (
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {loadError ? (
                  <View accessibilityRole="alert">
                    <Text variant="soft" color={colors.danger}>
                      {L === "hi"
                        ? "जर्नल लोड नहीं हुआ। नीचे पिछली प्रविष्टियाँ दिख सकती हैं।"
                        : "Journal could not refresh. Earlier entries may still appear below."}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={L === "hi" ? "फिर लोड करें" : "Retry loading"}
                      onPress={() => void load()}
                      style={{ marginTop: spacing.xs }}
                    >
                      <Text color={colors.brassSoft}>
                        {L === "hi" ? "फिर कोशिश करें" : "Retry"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
                {entries.map((e) => (
                  <Panel key={String(e.id)}>
                    <Text variant="eyebrow">{e.kind ?? "entry"}</Text>
                    <Text variant="soft" style={{ marginTop: spacing.sm }}>
                      {e.reflection}
                    </Text>
                  </Panel>
                ))}
                {!entries.length ? (
                  <Text variant="muted">
                    {L === "hi" ? "अभी खाली।" : "No entries yet."}
                  </Text>
                ) : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.lg, paddingBottom: spacing.xxl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: {
    marginTop: spacing.md,
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
    textAlignVertical: "top",
    fontFamily: "Sora_400Regular",
    fontSize: 16,
  },
});
