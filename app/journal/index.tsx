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

  const load = useCallback(async () => {
    if (!isSignedIn || isAnonymous) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await userApi.journal(filter === "all" ? undefined : filter);
      setEntries(res.entries ?? []);
    } catch {
      setEntries([]);
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
    try {
      await userApi.addJournal(text.trim(), { kind: writeKind });
      setText("");
      await load();
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
