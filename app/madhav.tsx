import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { buildChatRequestBody, streamChat } from "@/api/client";
import { chatApi } from "@/api/endpoints";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTextScale } from "@/context/TextScaleContext";
import { useTheme } from "@/context/ThemeContext";
import { detectUserCrisis, mentionsCrisisResource } from "@/safety/crisis";
import {
  getChatSessionId,
  setChatSessionId,
} from "@/storage/local";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import type { ChatMessage, Citation } from "@/types";
import { TokenBuffer } from "@/utils/TokenBuffer";

type UiMessage = ChatMessage & { id: string };

function isTransientNetworkError(message: string): boolean {
  return /network connection was lost|network request failed|could not reach|timed out|The Internet connection appears to be offline/i.test(
    message
  );
}

export default function MadhavScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { multiplier } = useTextScale();
  const { lang, t } = useLanguage();
  const {
    pendingPrompt,
    memberId,
    chartSessionId,
    birthPayload,
    slokaId,
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
  const autoSentPrompt = useRef<string | null>(null);
  const sending = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const abortRef = useRef<AbortController | null>(null);
  const backgroundAbort = useRef(false);
  const nearBottom = useRef(true);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const leaving =
        appState.current === "active" && next.match(/inactive|background/);
      appState.current = next;
      if (leaving && abortRef.current && sending.current) {
        backgroundAbort.current = true;
        abortRef.current.abort();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getChatSessionId();
      if (!id || !alive) return;
      setSessionId(id);
      try {
        const res = await chatApi.session(id);
        if (!alive || autoSentPrompt.current || sending.current) return;
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
      backgroundAbort.current = false;
      setError(null);
      setInput("");

      const userCrisis = detectUserCrisis(trimmed);
      setCrisisBanner(userCrisis ? t("crisisBody") : null);

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
      const ac = new AbortController();
      abortRef.current = ac;

      // The streaming assistant message is always the last element, so
      // replace it by index instead of mapping the whole array per update.
      const replaceLast = (update: (m: UiMessage) => UiMessage) => {
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex < 0 || prev[lastIndex].id !== assistantId) return prev;
          const next = prev.slice();
          next[lastIndex] = update(prev[lastIndex]);
          return next;
        });
      };

      // Commit streamed tokens at most every ~50ms — per-token setState
      // re-renders the screen for every SSE token, which drops frames on
      // long replies. `full` is the source of truth; the flushed chunk is
      // already folded into it by onToken.
      const buffer = new TokenBuffer(() => {
        const snapshot = full;
        replaceLast((m) => ({
          ...m,
          content: snapshot,
          citations,
          chartEpigraph: epigraph || undefined,
        }));
      });

      try {
        const history = [...base, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        await streamChat(
          buildChatRequestBody({
            language: lang,
            sessionId,
            slokaId,
            memberId,
            chartSessionId,
            birth: birthPayload,
            messages: history,
          }),
          {
            onSession: (id) => {
              const sid = typeof id === "string" ? id : String(id);
              setSessionId(sid);
              void setChatSessionId(sid);
            },
            onCitations: (cites) => {
              citations = (Array.isArray(cites) ? cites : []) as Citation[];
              replaceLast((m) => ({ ...m, citations }));
            },
            onToken: (token) => {
              full += token;
              buffer.push(token);
            },
            onReplace: (content) => {
              full = content;
              // Pending tokens are superseded by the full replacement text.
              buffer.flush();
              replaceLast((m) => ({
                ...m,
                content: full,
                citations,
                chartEpigraph: epigraph || undefined,
              }));
            },
            onChartEpigraph: (text) => {
              epigraph = text;
              replaceLast((m) => ({ ...m, chartEpigraph: text }));
            },
            onError: (message) => {
              if (backgroundAbort.current || appState.current !== "active") {
                return;
              }
              if (isTransientNetworkError(message) && full.trim()) {
                return;
              }
              setError(message);
              if (!userCrisis && mentionsCrisisResource(message)) {
                setCrisisBanner(message);
              }
            },
            onDone: () => {
              buffer.flush();
              if (!userCrisis && mentionsCrisisResource(full)) {
                setCrisisBanner(full);
              }
            },
          },
          ac.signal
        );

        buffer.flush();

        if (backgroundAbort.current) {
          // Keep whatever streamed before backgrounding; no error banner.
        } else if (!full.trim()) {
          const fallback =
            lang === "hi"
              ? "अभी उत्तर नहीं बन सका। थोड़ी देर बाद फिर प्रयास करें।"
              : "I could not form a reply just now. Try once more in a moment.";
          replaceLast((m) => ({ ...m, content: fallback, citations }));
        } else if (!userCrisis && mentionsCrisisResource(full)) {
          setCrisisBanner(full);
        }
      } catch (e) {
        // Land any buffered tokens first so the keep-or-remove check below
        // sees everything that actually streamed.
        buffer.flush();
        const message = (e as Error).message ?? "Chat failed";
        if (
          !backgroundAbort.current &&
          appState.current === "active" &&
          !(isTransientNetworkError(message) && full.trim())
        ) {
          setError(message);
          if (!userCrisis && mentionsCrisisResource(message)) {
            setCrisisBanner(message);
          }
        }
        setMessages((prev) => {
          const current = prev.find((m) => m.id === assistantId);
          if (current?.content?.trim()) return prev;
          return prev.filter((m) => m.id !== assistantId);
        });
      } finally {
        buffer.destroy();
        if (abortRef.current === ac) abortRef.current = null;
        setLoading(false);
        setStreaming(false);
        sending.current = false;
        backgroundAbort.current = false;
        requestAnimationFrame(() => {
          if (nearBottom.current) {
            listRef.current?.scrollToEnd({ animated: true });
          }
        });
      }
    },
    [
      messages,
      lang,
      sessionId,
      memberId,
      chartSessionId,
      birthPayload,
      slokaId,
      setStreaming,
      t,
    ]
  );

  useEffect(() => {
    const prompt = pendingPrompt?.trim();
    if (!prompt || autoSentPrompt.current === prompt) return;
    autoSentPrompt.current = prompt;
    clearPending();
    void sendMessage(prompt);
  }, [pendingPrompt, clearPending, sendMessage]);

  const onPressCitation = useCallback(
    (id: Citation["id"]) => {
      router.push(`/sloka/${id}`);
    },
    [router]
  );

  const renderMessage = ({ item }: { item: UiMessage }) => {
    const isUser = item.role === "user";
    return (
      <MessageBubble
        isUser={isUser}
        content={item.content}
        chartEpigraph={item.chartEpigraph}
        citations={item.citations}
        label={isUser ? t("you") : t("madhav")}
        lang={lang}
        loading={loading}
        multiplier={multiplier}
        colors={colors}
        onPressCitation={onPressCitation}
      />
    );
  };

  const composerPad = Math.max(insets.bottom, spacing.sm);

  return (
    <Screen
      testID="screen-madhav"
      padded={false}
      edges={["top", "left", "right"]}
      atmosphere="soft"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.hairline, backgroundColor: colors.panel },
          ]}
        >
          <Image
            source={images.madhavPortrait}
            style={styles.portrait}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text variant="title" color={colors.brassSoft} style={styles.madhavName}>
              Madhav
            </Text>
            <Text variant="eyebrow" style={styles.guideLabel}>
              {lang === "hi" ? "गीता मार्गदर्शक" : "Gita guide"}
            </Text>
          </View>
          <Pressable
            testID="madhav-close"
            accessibilityRole="button"
            accessibilityLabel="Close Madhav"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.close,
              {
                borderColor: colors.hairline,
                opacity: pressed ? 0.55 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.textSoft, fontSize: 22, lineHeight: 24 }}>×</Text>
          </Pressable>
        </View>
        <View style={[styles.disclaimer, { borderBottomColor: colors.hairline }]}>
          <Text variant="muted" style={styles.disclaimerText}>
            {lang === "hi"
              ? "एक आध्यात्मिक साथी, चिकित्सक नहीं।"
              : "A spiritual companion, not a therapist."}
          </Text>
        </View>

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
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
            flexGrow: 1,
          }}
          renderItem={renderMessage}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const pad = 80;
            nearBottom.current =
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - pad;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (nearBottom.current) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
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
              backgroundColor: colors.navBg,
              paddingBottom: composerPad,
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
                backgroundColor: colors.panelStrong,
                fontSize: 15 * multiplier,
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
            <Text style={{ color: colors.onBrass, fontSize: 20, lineHeight: 22 }}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  portrait: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(201, 162, 39, 0.45)",
  },
  madhavName: {
    fontFamily: "Fraunces_500Medium",
    fontSize: 20,
    lineHeight: 24,
  },
  guideLabel: {
    marginTop: 2,
    fontSize: 9,
    letterSpacing: 1.8,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 14,
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
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: "Sora_400Regular",
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
