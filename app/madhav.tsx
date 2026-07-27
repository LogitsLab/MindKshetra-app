import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { streamChat } from "@/api/client";
import { chatApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getChatSessionId,
  setChatSessionId,
} from "@/storage/local";
import { radii, spacing } from "@/theme/tokens";
import type { ChatMessage, Citation } from "@/types";

type UiMessage = ChatMessage & { id: string };

function looksLikeCrisis(text: string): boolean {
  return /helpline|icall|9152987821|vandrevala|आत्महत्या|आपतकाल/i.test(text);
}

export default function MadhavScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const {
    pendingPrompt,
    memberId,
    chartSessionId,
    clearPending,
    setStreaming,
  } = useMadhav();

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("welcomeMadhav"),
    },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisBanner, setCrisisBanner] = useState<string | null>(null);
  const listRef = useRef<FlatList<UiMessage>>(null);
  const autoSent = useRef(false);
  const sending = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getChatSessionId();
      if (!id || !alive) return;
      setSessionId(id);
      try {
        const res = await chatApi.session(id);
        if (!alive || autoSent.current || sending.current) return;
        const prior = (res.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m, i) => ({
            id: `hist-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        if (prior.length) {
          setMessages([
            { id: "welcome", role: "assistant", content: t("welcomeMadhav") },
            ...prior,
          ]);
        }
      } catch {
        /* session may have expired */
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || sending.current) return;
      sending.current = true;
      setError(null);
      setCrisisBanner(null);
      setInput("");

      const userMsg: UiMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `a-${Date.now()}`;
      const base = messages.filter((m) => m.id !== "welcome");

      setMessages([
        ...messages,
        userMsg,
        { id: assistantId, role: "assistant", content: "", citations: [] },
      ]);
      setLoading(true);
      setStreaming(true);

      let full = "";
      let citations: Citation[] = [];
      let epigraph = "";

      try {
        const history = [...base, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await streamChat(
          {
            language: lang,
            sessionId: sessionId ?? undefined,
            memberId: memberId ?? undefined,
            chartSessionId: chartSessionId ?? undefined,
            messages: history,
          },
          {
            onSession: (id) => {
              const sid = typeof id === "string" ? id : String(id);
              setSessionId(sid);
              void setChatSessionId(sid);
            },
            onCitations: (cites) => {
              citations = (Array.isArray(cites) ? cites : []) as Citation[];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, citations } : m
                )
              );
            },
            onToken: (token) => {
              full += token;
              const snapshot = full;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: snapshot, citations, chartEpigraph: epigraph || undefined }
                    : m
                )
              );
            },
            onReplace: (content) => {
              full = content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: full, citations, chartEpigraph: epigraph || undefined }
                    : m
                )
              );
            },
            onChartEpigraph: (text) => {
              epigraph = text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, chartEpigraph: text } : m
                )
              );
            },
            onError: (message) => {
              setError(message);
              if (looksLikeCrisis(message)) setCrisisBanner(message);
            },
            onDone: () => {
              if (looksLikeCrisis(full)) setCrisisBanner(full);
            },
          }
        );

        if (!full.trim()) {
          const fallback =
            lang === "hi"
              ? "अभी उत्तर नहीं बन सका। थोड़ी देर बाद फिर प्रयास करें।"
              : "I could not form a reply just now. Try once more in a moment.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fallback, citations } : m
            )
          );
        } else if (looksLikeCrisis(full)) {
          setCrisisBanner(full);
        }
      } catch (e) {
        const message = (e as Error).message ?? "Chat failed";
        setError(message);
        if (looksLikeCrisis(message)) setCrisisBanner(message);
        setMessages((prev) => {
          const current = prev.find((m) => m.id === assistantId);
          if (current?.content?.trim()) return prev;
          return prev.filter((m) => m.id !== assistantId);
        });
      } finally {
        setLoading(false);
        setStreaming(false);
        sending.current = false;
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: true })
        );
      }
    },
    [messages, lang, sessionId, memberId, chartSessionId, setStreaming]
  );

  useEffect(() => {
    if (!pendingPrompt?.trim() || autoSent.current) return;
    autoSent.current = true;
    const prompt = pendingPrompt;
    clearPending();
    void sendMessage(prompt);
  }, [pendingPrompt, clearPending, sendMessage]);

  const renderMessage = ({ item }: { item: UiMessage }) => {
    const isUser = item.role === "user";
    const crisis = !isUser && looksLikeCrisis(item.content);

    return (
      <View
        style={[
          styles.bubble,
          {
            alignSelf: isUser ? "flex-end" : "flex-start",
            backgroundColor: isUser ? colors.surface : colors.panel,
            borderColor: crisis ? colors.danger : colors.line,
          },
        ]}
      >
        <Text variant="eyebrow" style={{ color: colors.brassSoft }}>
          {isUser ? t("you") : t("madhav")}
        </Text>
        {item.chartEpigraph ? (
          <Text
            variant="title"
            style={{
              marginTop: spacing.sm,
              fontFamily: "Fraunces_500Medium",
              fontSize: 16,
              lineHeight: 24,
              borderLeftWidth: 2,
              borderLeftColor: colors.line,
              paddingLeft: spacing.sm,
            }}
          >
            {item.chartEpigraph}
          </Text>
        ) : null}
        <Text
          variant="body"
          style={{
            marginTop: spacing.sm,
            color: crisis ? colors.danger : colors.text,
          }}
        >
          {item.content || (loading ? "…" : "")}
        </Text>
        {item.citations && item.citations.length > 0 ? (
          <View style={[styles.cites, { borderTopColor: colors.hairline }]}>
            {item.citations.slice(0, 4).map((c) => (
              <Pressable
                key={`${c.chapter}-${c.verse_number}-${c.id}`}
                onPress={() => router.push(`/sloka/${c.id}`)}
                style={[styles.citeRow, { borderBottomColor: colors.hairline }]}
              >
                <Text variant="muted" style={{ color: colors.brassSoft }}>
                  {c.chapter}.{c.verse_number}
                  {c.snippet ? ` — ${c.snippet}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen padded={false} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
      >
        {crisisBanner ? (
          <View
            style={[
              styles.crisis,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}
          >
            <Text variant="eyebrow" style={{ color: colors.danger }}>
              Support
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.xs, color: colors.danger }}>
              {crisisBanner}
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
          }}
          renderItem={renderMessage}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            loading ? (
              <View style={{ paddingVertical: spacing.sm }}>
                <ActivityIndicator color={colors.brass} />
                <Text variant="muted" style={{ textAlign: "center", marginTop: 4 }}>
                  {t("reflecting")}
                </Text>
              </View>
            ) : null
          }
        />

        {error && !crisisBanner ? (
          <Text
            variant="muted"
            style={{
              color: colors.danger,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.xs,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.hairline,
              backgroundColor: colors.navBg,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={lang === "hi" ? "पार्थ, लिखें…" : "Speak freely…"}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.line,
                backgroundColor: colors.inputBg,
              },
            ]}
          />
          <Pressable
            onPress={() => void sendMessage(input)}
            disabled={loading || !input.trim()}
            style={[
              styles.send,
              {
                backgroundColor: colors.brass,
                opacity: loading || !input.trim() ? 0.5 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.onBrass, fontFamily: "Sora_600SemiBold" }}>
              {t("send")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "92%",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cites: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.sm,
  },
  citeRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  crisis: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: "Sora_400Regular",
    fontSize: 15,
  },
  send: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
