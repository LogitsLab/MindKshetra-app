import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { MarkdownText } from "@/components/MarkdownText";
import { buildChatRequestBody, streamChat } from "@/api/client";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { TokenBuffer } from "@/utils/TokenBuffer";

type ChatMsg = { role: "user" | "assistant"; content: string };

type Props = {
  title: string;
  memberId?: string;
  chartSessionId?: string;
  birth?: Record<string, unknown> | null;
  starters: string[];
  pendingPrompt?: string | null;
  onPendingConsumed?: () => void;
};

export function ChartChatPanel({
  title,
  memberId,
  chartSessionId,
  birth,
  starters,
  pendingPrompt,
  onPendingConsumed,
}: Props) {
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");

    let assistant = "";
    const buffer = new TokenBuffer(() => {
      const snapshot = assistant;
      setMessages([...next, { role: "assistant", content: snapshot }]);
    });

    try {
      await streamChat(
        buildChatRequestBody({
          language: lang,
          memberId: memberId ?? null,
          chartSessionId: chartSessionId ?? null,
          birth: chartSessionId ? birth ?? null : null,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
        {
          onToken: (token) => {
            assistant += token;
            buffer.push(token);
          },
          onReplace: (full) => {
            assistant = full;
            buffer.flush();
            setMessages([...next, { role: "assistant", content: full }]);
          },
          onError: (message) => setError(message),
        }
      );
      buffer.flush();
      if (!assistant.trim()) {
        setMessages([
          ...next,
          { role: "assistant", content: t("astroChatEmpty") },
        ]);
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages(next);
    } finally {
      buffer.destroy();
      busyRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!pendingPrompt || busyRef.current) return;
    const p = pendingPrompt;
    onPendingConsumed?.();
    void send(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="eyebrow">{t("astroChartAttached")}</Text>
      <Text variant="soft" color={colors.brassSoft}>
        {title}
      </Text>
      <Text variant="muted">{t("astroChatTitle")}</Text>

      {messages.length === 0 && !busy ? (
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <Text variant="muted">{t("astroChatStarters")}</Text>
          {starters.map((s) => (
            <Pressable
              key={s}
              onPress={() => void send(s)}
              style={{
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radii.md,
                padding: spacing.sm,
              }}
            >
              <Text variant="soft">{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {messages.map((m, i) => (
        <View
          key={`${m.role}-${i}`}
          style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "92%",
            backgroundColor:
              m.role === "user" ? "rgba(201,162,39,0.15)" : "transparent",
            padding: m.role === "user" ? spacing.sm : 0,
            borderRadius: radii.md,
            marginTop: spacing.xs,
          }}
        >
          <Text variant="muted" style={{ marginBottom: 2 }}>
            {m.role === "user" ? t("you") : t("madhav")}
          </Text>
          {m.role === "user" ? (
            <Text variant="soft">{m.content}</Text>
          ) : (
            <MarkdownText text={m.content} variant="soft" />
          )}
        </View>
      ))}

      {busy ? (
        <ActivityIndicator color={colors.brass} style={{ marginTop: spacing.sm }} />
      ) : null}
      {error ? (
        <Text variant="muted" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          marginTop: spacing.sm,
          alignItems: "flex-end",
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("astroAskThisChart")}
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!busy}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.md,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.sm,
            color: colors.text,
          }}
        />
        <Pressable
          onPress={() => void send(input)}
          disabled={busy || !input.trim()}
          style={{
            backgroundColor: colors.brass,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderRadius: radii.md,
            opacity: busy || !input.trim() ? 0.5 : 1,
          }}
        >
          <Text variant="soft" color={colors.onBrass}>
            {t("send")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
