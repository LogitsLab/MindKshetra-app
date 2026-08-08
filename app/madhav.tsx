import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { buildChatRequestBody, streamChat } from "@/api/client";
import { astrologyApi, chatApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTextScale } from "@/context/TextScaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useMadhavVoiceInput } from "@/hooks/useMadhavVoiceInput";
import { detectUserCrisis, mentionsCrisisResource } from "@/safety/crisis";
import {
  clearChatSessionId,
  getChatSessionId,
  setChatSessionId,
} from "@/storage/local";
import { images } from "@/theme/assets";
import { radii, spacing } from "@/theme/tokens";
import type { ChatMessage, Citation } from "@/types";
import { TokenBuffer } from "@/utils/TokenBuffer";

type ChatSessionSummary = {
  id: string;
  updated_at: string;
  title?: string;
};

function MicIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 10v1a7 7 0 0 1-14 0v-1"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 18v3"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type UiMessage = ChatMessage & { id: string };

function isTransientNetworkError(message: string): boolean {
  return /network connection was lost|network request failed|could not reach|timed out|The Internet connection appears to be offline/i.test(
    message
  );
}

export default function MadhavScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { multiplier } = useTextScale();
  const { lang, t } = useLanguage();
  const { isSignedIn } = useAuth();
  const {
    pendingPrompt,
    memberId,
    chartSessionId,
    birthPayload,
    slokaId,
    chartExplicitlyCleared,
    attachMemberChart,
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
  const [recentSessions, setRecentSessions] = useState<ChatSessionSummary[]>(
    []
  );
  const [showSessions, setShowSessions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisBanner, setCrisisBanner] = useState<string | null>(null);
  // Modal + headerShown:false makes KeyboardAvoidingView under-shift on iOS;
  // track keyboard height and pad the composer directly instead.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList<UiMessage>>(null);
  const autoSentPrompt = useRef<string | null>(null);
  const sending = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const abortRef = useRef<AbortController | null>(null);
  const backgroundAbort = useRef(false);
  const nearBottom = useRef(true);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // Chart-grounded default: when opening Madhav without verse/session context,
  // quietly attach the self member chart if one exists. Fail soft.
  useEffect(() => {
    if (!isSignedIn) return;
    if (slokaId != null || memberId || chartSessionId || chartExplicitlyCleared) {
      return;
    }
    let alive = true;
    astrologyApi
      .members()
      .then((res) => {
        if (!alive) return;
        const members = res.members ?? [];
        if (!members.length) return;
        const self =
          members.find(
            (m) => (m.relationship ?? "").toLowerCase() === "self"
          ) ?? members[0];
        if (self?.id) attachMemberChart(self.id);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [
    isSignedIn,
    slokaId,
    memberId,
    chartSessionId,
    chartExplicitlyCleared,
    attachMemberChart,
  ]);

  const voiceLabels = useMemo(
    () => ({
      unsupported: t("voiceUnsupported"),
      error: t("voiceError"),
    }),
    [t]
  );

  const {
    listening,
    supported: voiceSupported,
    toggleListening,
    stopListening,
    syncBaseInput,
  } = useMadhavVoiceInput({
    lang,
    disabled: loading,
    onTranscript: setInput,
    onError: setError,
    labels: voiceLabels,
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const leaving =
        appState.current === "active" && next.match(/inactive|background/);
      appState.current = next;
      if (leaving) {
        stopListening();
        if (abortRef.current && sending.current) {
          backgroundAbort.current = true;
          abortRef.current.abort();
        }
      }
    });
    return () => sub.remove();
  }, [stopListening]);

  const loadRecentSessions = useCallback(async () => {
    if (!isSignedIn || typeof chatApi.sessions !== "function") {
      setRecentSessions([]);
      return;
    }
    try {
      const res = await chatApi.sessions();
      setRecentSessions(res.sessions ?? []);
    } catch {
      setRecentSessions([]);
    }
  }, [isSignedIn]);

  useEffect(() => {
    void loadRecentSessions();
  }, [loadRecentSessions]);

  const applySessionMessages = useCallback(
    (prior: { role: "user" | "assistant"; content: string }[]) => {
      setMessages([
        { id: "welcome", role: "assistant", content: t("welcomeMadhav") },
        ...prior.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role,
          content: m.content,
        })),
      ]);
    },
    [t]
  );

  const switchSession = useCallback(
    async (id: string) => {
      if (sending.current || loading) return;
      setError(null);
      setShowSessions(false);
      setSessionId(id);
      void setChatSessionId(id);
      try {
        const res = await chatApi.session(id);
        const prior = (res.messages ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        applySessionMessages(prior);
      } catch {
        setError(
          lang === "hi"
            ? "यह वार्ता नहीं खुल सकी।"
            : "Could not open that chat."
        );
      }
    },
    [applySessionMessages, lang, loading]
  );

  const startNewChat = useCallback(() => {
    if (sending.current || loading) return;
    setSessionId(null);
    void clearChatSessionId();
    setMessages([
      { id: "welcome", role: "assistant", content: t("welcomeMadhav") },
    ]);
    setShowSessions(false);
    setError(null);
  }, [loading, t]);

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
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        if (prior.length) {
          applySessionMessages(prior);
        }
      } catch {
        /* session may have expired */
      }
    })();
    return () => {
      alive = false;
    };
  }, [applySessionMessages]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || sending.current) return;
      stopListening();
      sending.current = true;
      backgroundAbort.current = false;
      setError(null);
      setInput("");
      syncBaseInput("");

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
              void loadRecentSessions();
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
      stopListening,
      syncBaseInput,
      loadRecentSessions,
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

  const onPracticeCitation = useCallback(
    (id: Citation["id"]) => {
      router.push({
        pathname: "/sadhana",
        params: { slokaId: String(id) },
      });
    },
    [router]
  );

  const inActiveChat = messages.some(
    (m) => m.id !== "welcome" && m.role === "user"
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
        practiceLabel={t("citePractice")}
        lang={lang}
        loading={loading}
        multiplier={multiplier}
        colors={colors}
        onPressCitation={onPressCitation}
        onPracticeCitation={onPracticeCitation}
      />
    );
  };

  // Android uses softwareKeyboardLayoutMode:"resize", so only iOS needs the
  // manual lift. When the keyboard is up it covers the home indicator.
  const keyboardLift = Platform.OS === "ios" ? keyboardHeight : 0;
  const composerPad =
    keyboardLift > 0 ? spacing.sm : Math.max(insets.bottom, spacing.sm);

  return (
    <Screen
      testID="screen-madhav"
      padded={false}
      edges={["top", "left", "right"]}
      atmosphere="soft"
    >
      <View style={{ flex: 1 }}>
        <ImageBackground
          source={images.krishnaVishwaroop}
          style={styles.headerHero}
          imageStyle={styles.headerHeroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              "rgba(7,9,15,0.72)",
              "rgba(7,9,15,0.88)",
              "rgba(7,9,15,0.96)",
            ]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <Image
              source={images.madhavPortrait}
              style={styles.portrait}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text
                variant="title"
                color={colors.brassSoft}
                style={styles.madhavName}
              >
                Madhav
              </Text>
              <Text
                variant="eyebrow"
                color={colors.onMediaMuted}
                style={styles.guideLabel}
              >
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
                  borderColor: "rgba(232, 224, 208, 0.28)",
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.onMedia,
                  fontSize: 22,
                  lineHeight: 24,
                }}
              >
                ×
              </Text>
            </Pressable>
          </View>
          <View style={styles.disclaimer}>
            <Text
              variant="muted"
              color={colors.onMediaMuted}
              style={styles.disclaimerText}
            >
              {lang === "hi"
                ? "एक आध्यात्मिक साथी, चिकित्सक नहीं।"
                : "A spiritual companion, not a therapist."}
            </Text>
          </View>
          {isSignedIn && recentSessions.length > 0 ? (
            <View style={styles.sessionBar}>
              <Pressable
                onPress={() => setShowSessions((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t("openChatHistory")}
                style={[
                  styles.sessionChip,
                  {
                    borderColor: "rgba(232, 224, 208, 0.28)",
                    backgroundColor: showSessions
                      ? "rgba(201, 162, 39, 0.22)"
                      : "rgba(7,9,15,0.35)",
                  },
                ]}
              >
                <Text
                  variant="muted"
                  color={colors.onMedia}
                  style={styles.sessionChipText}
                >
                  {t("recentChats")}
                </Text>
              </Pressable>
              {inActiveChat || sessionId ? (
                <Pressable
                  onPress={startNewChat}
                  disabled={loading}
                  accessibilityRole="button"
                  style={[
                    styles.sessionChip,
                    {
                      borderColor: "rgba(232, 224, 208, 0.28)",
                      backgroundColor: "rgba(7,9,15,0.35)",
                      opacity: loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    variant="muted"
                    color={colors.onMedia}
                    style={styles.sessionChipText}
                  >
                    {t("newChat")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ImageBackground>

        {showSessions ||
        (isSignedIn &&
          recentSessions.length > 0 &&
          !inActiveChat &&
          !pendingPrompt) ? (
          <View
            style={[
              styles.sessionList,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
            <Text variant="eyebrow" color={colors.brassSoft}>
              {t("chatHistory")}
            </Text>
            {recentSessions.length === 0 ? (
              <Text variant="muted" style={{ marginTop: spacing.sm }}>
                {t("noSavedChats")}
              </Text>
            ) : (
              recentSessions.slice(0, 8).map((s) => {
                const when = new Date(s.updated_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
                const headline =
                  s.title?.trim() ||
                  (lang === "hi" ? "वार्ता" : "Conversation");
                const active = s.id === sessionId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => void switchSession(s.id)}
                    style={[
                      styles.sessionRow,
                      {
                        borderBottomColor: colors.hairline,
                        backgroundColor: active
                          ? colors.surfaceHover
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      variant="soft"
                      color={active ? colors.brassSoft : colors.text}
                      numberOfLines={1}
                    >
                      {headline}
                    </Text>
                    <Text variant="muted" style={{ marginTop: 2, fontSize: 11 }}>
                      {when}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

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
              marginBottom: keyboardLift,
            },
          ]}
        >
          {voiceSupported ? (
            <Pressable
              onPress={() => toggleListening(input)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ selected: listening }}
              accessibilityLabel={listening ? t("voiceStop") : t("voiceListen")}
              testID="madhav-voice"
              style={[
                styles.mic,
                {
                  borderColor: listening ? colors.brass : colors.line,
                  backgroundColor: listening
                    ? "rgba(201, 162, 39, 0.22)"
                    : colors.panelStrong,
                  opacity: loading ? 0.5 : 1,
                },
              ]}
            >
              <MicIcon color={listening ? colors.brassSoft : colors.textMuted} />
            </Pressable>
          ) : null}
          <TextInput
            value={input}
            onChangeText={(value) => {
              setInput(value);
              syncBaseInput(value);
            }}
            placeholder={
              listening
                ? t("voiceListening")
                : lang === "hi"
                  ? "पार्थ, लिखें या बोलें…"
                  : "Type or speak…"
            }
            placeholderTextColor={colors.textMuted}
            multiline
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: listening ? colors.brass : colors.line,
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerHero: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: "rgba(201, 162, 39, 0.22)",
  },
  headerHeroImage: {
    // Keep the cosmic figure in frame under the heavy scrim.
    top: -36,
  },
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
  },
  disclaimerText: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 14,
  },
  sessionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sessionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sessionChipText: {
    fontSize: 11,
    letterSpacing: 0.4,
  },
  sessionList: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  sessionRow: {
    paddingVertical: spacing.sm,
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
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexShrink: 0,
  },
  mic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
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
