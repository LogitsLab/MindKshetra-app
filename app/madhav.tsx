import React, { useCallback, useEffect, useRef, useState } from "react";
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
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { KeyboardProvider, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { EmptyState } from "@/components/SlokaCard";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { buildChatRequestBody, streamChat } from "@/api/client";
import { astrologyApi, chatApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useMadhav } from "@/context/MadhavContext";
import { useTextScale } from "@/context/TextScaleContext";
import { useTheme } from "@/context/ThemeContext";
import { detectUserCrisis, mentionsCrisisResource } from "@/safety/crisis";
import {
  clearChatSessionId,
  getChartInviteDismissed,
  getChatSessionId,
  setChartInviteDismissed,
  setChatSessionId,
} from "@/storage/local";
import { images } from "@/theme/assets";
import { mediaOverlay, radii, spacing } from "@/theme/tokens";
import { multilineInputProps } from "@/components/KeyboardForm";
import type { ChatMessage, Citation } from "@/types";
import { TokenBuffer } from "@/utils/TokenBuffer";

type ChatSessionSummary = {
  id: string;
  updated_at: string;
  title?: string;
};

type UiMessage = ChatMessage & { id: string };

function fillName(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

function isTransientNetworkError(message: string): boolean {
  return /network connection was lost|network request failed|could not reach|timed out|The Internet connection appears to be offline/i.test(
    message
  );
}

function ChartContextChip({
  label,
  clearLabel,
  onClear,
  onMedia = false,
}: {
  label: string;
  clearLabel: string;
  onClear: () => void;
  onMedia?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.chartChip,
        {
          borderColor: onMedia ? mediaOverlay.ivoryHairline : colors.line,
          backgroundColor: onMedia ? mediaOverlay.voidSoft : colors.surface,
        },
      ]}
    >
      <Text
        variant="muted"
        color={colors.brassSoft}
        numberOfLines={1}
        style={{ fontSize: 11, flexShrink: 1 }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
        onPress={onClear}
        hitSlop={8}
      >
        <Text
          variant="muted"
          color={onMedia ? colors.onMedia : colors.textMuted}
          style={{ fontSize: 16, lineHeight: 18 }}
        >
          ×
        </Text>
      </Pressable>
    </View>
  );
}

function IncognitoToggle({
  on,
  label,
  onToggle,
  onMedia = false,
}: {
  on: boolean;
  label: string;
  onToggle: () => void;
  onMedia?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID="madhav-incognito"
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onToggle}
      hitSlop={8}
      style={[
        styles.incognitoToggle,
        {
          borderColor: on
            ? colors.brass
            : onMedia
              ? mediaOverlay.ivoryHairline
              : colors.line,
          backgroundColor: on
            ? colors.surfaceHover
            : onMedia
              ? mediaOverlay.voidSoft
              : colors.surface,
        },
      ]}
    >
      <Text
        variant="muted"
        color={
          on ? colors.brassSoft : onMedia ? colors.onMedia : colors.textMuted
        }
        numberOfLines={1}
        style={{ fontSize: 11 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function MadhavScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { multiplier } = useTextScale();
  const { lang, t } = useLanguage();
  const fallbackName = lang === "hi" ? "पार्थ" : "Parth";
  const [addressName, setAddressName] = useState(fallbackName);
  const [todayGreeting, setTodayGreeting] = useState<string | null>(null);
  const [starters, setStarters] = useState<string[]>([]);
  const [hasSavedCharts, setHasSavedCharts] = useState<boolean | null>(null);
  const [inviteDismissed, setInviteDismissed] = useState(true);

  const welcomeText =
    todayGreeting ?? fillName(t("welcomeMadhav"), addressName);
  const { isSignedIn } = useAuth();
  const {
    pendingPrompt,
    contextLabel,
    memberId,
    chartSessionId,
    birthPayload,
    slokaId,
    chartExplicitlyCleared,
    attachMemberChart,
    clearChartGrounding,
    clearPending,
    setStreaming,
  } = useMadhav();

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcomeText,
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
  // KeyboardStickyView moves the composer with the IME on both platforms.
  // keyboardHeight still collapses the hero so the input is not squeezed to 0.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Incognito: while on, nothing is written to storage or restored on reopen.
  // A ref mirrors it so async stream callbacks read the current value.
  const [incognito, setIncognito] = useState(false);
  const incognitoRef = useRef(false);
  useEffect(() => {
    incognitoRef.current = incognito;
  }, [incognito]);
  const listRef = useRef<FlatList<UiMessage>>(null);
  const autoSentPrompt = useRef<string | null>(null);
  const sending = useRef(false);
  const lastPromptRef = useRef<string | null>(null);
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

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0]?.id === "welcome") {
        return [{ id: "welcome", role: "assistant", content: welcomeText }];
      }
      return prev.map((m) =>
        m.id === "welcome" ? { ...m, content: welcomeText } : m
      );
    });
  }, [welcomeText]);

  useEffect(() => {
    let alive = true;
    setTodayGreeting(null);
    setStarters([]);
    setAddressName((prev) =>
      prev === "Parth" || prev === "पार्थ"
        ? lang === "hi"
          ? "पार्थ"
          : "Parth"
        : prev
    );
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }
    chatApi
      .today({ lang, tz: timezone })
      .then((data) => {
        if (!alive) return;
        const name = data.addressName?.trim();
        if (name) setAddressName(name);
        if (data.greeting?.trim()) setTodayGreeting(data.greeting.trim());
        const chips = (data.starters ?? []).filter(
          (s) => typeof s === "string" && s.trim().length > 0
        );
        if (chips.length) setStarters(chips);
      })
      .catch(() => {
        if (!alive) return;
        setStarters([t("starter1"), t("starter2"), t("starter3")]);
      });
    return () => {
      alive = false;
    };
  }, [lang, t]);

  useEffect(() => {
    let alive = true;
    void getChartInviteDismissed().then((dismissed) => {
      if (alive) setInviteDismissed(dismissed);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Chart-grounded default: when opening Madhav without verse/session context,
  // quietly attach the self member chart if one exists. Fail soft.
  useEffect(() => {
    if (!isSignedIn) {
      setHasSavedCharts(null);
      return;
    }
    if (slokaId != null || memberId || chartSessionId || chartExplicitlyCleared) {
      return;
    }
    let alive = true;
    astrologyApi
      .members()
      .then((res) => {
        if (!alive) return;
        const members = res.members ?? [];
        setHasSavedCharts(members.length > 0);
        if (!members.length) return;
        const self =
          members.find(
            (m) => (m.relationship ?? "").toLowerCase() === "self"
          ) ?? members[0];
        if (self?.id) attachMemberChart(self.id, self.name);
      })
      .catch(() => {
        if (alive) setHasSavedCharts(null);
      });
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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const leaving =
        appState.current === "active" && next.match(/inactive|background/);
      appState.current = next;
      if (leaving) {
        if (abortRef.current && sending.current) {
          backgroundAbort.current = true;
          abortRef.current.abort();
        }
      }
    });
    return () => sub.remove();
  }, []);

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
        { id: "welcome", role: "assistant", content: welcomeText },
        ...prior.map((m, i) => ({
          id: `hist-${i}`,
          role: m.role,
          content: m.content,
        })),
      ]);
    },
    [welcomeText]
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
          t("chatOpenFailed")
        );
      }
    },
    [applySessionMessages, t, loading]
  );

  const startNewChat = useCallback(() => {
    if (sending.current || loading) return;
    setSessionId(null);
    void clearChatSessionId();
    setMessages([
      { id: "welcome", role: "assistant", content: welcomeText },
    ]);
    setShowSessions(false);
    setError(null);
  }, [loading, welcomeText]);

  // Turning incognito on (or off) starts a fresh conversation and drops the
  // saved session pointer, so an ephemeral chat can never be restored later.
  const toggleIncognito = useCallback(() => {
    if (sending.current || loading) return;
    setIncognito((prev) => !prev);
    setSessionId(null);
    void clearChatSessionId();
    setMessages([{ id: "welcome", role: "assistant", content: welcomeText }]);
    setShowSessions(false);
    setError(null);
  }, [loading, welcomeText]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Never restore a prior conversation while incognito (this effect re-runs
      // when the greeting/language changes, so the guard is load-bearing).
      if (incognitoRef.current) return;
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
      sending.current = true;
      backgroundAbort.current = false;
      lastPromptRef.current = trimmed;
      setError(null);
      setInput("");

      const userCrisis = detectUserCrisis(trimmed);
      setCrisisBanner(userCrisis ? t("crisisBody") : null);

      const last = messages[messages.length - 1];
      const alreadyQueued =
        last?.role === "user" && last.content === trimmed;
      const userMsg: UiMessage = alreadyQueued
        ? last
        : {
            id: `u-${Date.now()}`,
            role: "user",
            content: trimmed,
          };
      const assistantId = `a-${Date.now()}`;
      const base = alreadyQueued
        ? messages.filter((m) => m.id !== "welcome")
        : messages.filter((m) => m.id !== "welcome");

      setMessages(
        alreadyQueued
          ? [
              ...messages,
              { id: assistantId, role: "assistant", content: "", citations: [] },
            ]
          : [
              ...messages,
              userMsg,
              { id: assistantId, role: "assistant", content: "", citations: [] },
            ]
      );
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
        const history = (alreadyQueued ? base : [...base, userMsg]).map((m) => ({
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
              // Incognito: keep the id in memory for reply continuity this
              // session, but never write it to storage or surface it in history.
              if (!incognitoRef.current) {
                void setChatSessionId(sid);
                void loadRecentSessions();
              }
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
          const fallback = t("chatReplyFailed");
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
  const showStarters =
    !inActiveChat && !pendingPrompt && !loading && starters.length > 0;
  const chartGrounded = Boolean(memberId || chartSessionId || birthPayload);
  const showChartInvite =
    isSignedIn &&
    hasSavedCharts === false &&
    showStarters &&
    !inviteDismissed &&
    !chartGrounded;

  const dismissChartInvite = () => {
    setInviteDismissed(true);
    void setChartInviteDismissed();
  };

  const retryLastPrompt = () => {
    const prompt = lastPromptRef.current;
    if (prompt) void sendMessage(prompt);
  };

  const renderMessage = ({ item }: { item: UiMessage }) => {
    const isUser = item.role === "user";
    return (
      <MessageBubble
        isUser={isUser}
        content={item.content}
        chartEpigraph={item.chartEpigraph}
        citations={item.citations}
        label={isUser ? addressName : t("madhav")}
        practiceLabel={t("citePractice")}
        lang={lang}
        loading={loading}
        multiplier={multiplier}
        colors={colors}
        onPressCitation={onPressCitation}
        onPracticeCitation={onPracticeCitation}
        listenLabel={isUser ? undefined : t("ttsListen")}
        stopLabel={isUser ? undefined : t("ttsStop")}
        unsupportedLabel={isUser ? undefined : t("ttsUnsupported")}
      />
    );
  };

  const { width, height } = useWindowDimensions();
  // Edge-to-edge Android does not resize the window. Lift and collapse on both.
  const keyboardOpen = keyboardHeight > 0;
  const landscape = width > height;
  const compactChrome = keyboardOpen || landscape;
  const composerPad = keyboardOpen
    ? spacing.sm
    : Math.max(insets.bottom, spacing.sm);

  return (
    // Madhav is a native modal (presentation: "modal"), which renders in a
    // separate window the root KeyboardProvider does not reach. Without its own
    // provider here, KeyboardStickyView cannot read the IME height and the
    // composer stays hidden under the keyboard on both platforms.
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
    <Screen
      testID="screen-madhav"
      padded={false}
      edges={["top", "left", "right"]}
      atmosphere="soft"
    >
      <View style={{ flex: 1 }}>
        {!compactChrome ? (
        <ImageBackground
          source={images.krishnaVishwaroop}
          style={styles.headerHero}
          imageStyle={styles.headerHeroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={mediaOverlay.madhavHero}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <Image
              source={images.madhavPortrait}
              style={[styles.portrait, { borderColor: mediaOverlay.brassBorder }]}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text
                variant="title"
                color={colors.brassSoft}
                style={styles.madhavName}
              >
                {t("madhav")}
              </Text>
              <Text
                variant="eyebrow"
                color={colors.onMediaMuted}
                style={styles.guideLabel}
              >
                {t("madhavGuide")}
              </Text>
              {chartGrounded && contextLabel ? (
                <ChartContextChip
                  label={contextLabel}
                  clearLabel={t("chartClear")}
                  onClear={clearChartGrounding}
                  onMedia
                />
              ) : contextLabel ? (
                <Text
                  variant="muted"
                  color={colors.brassSoft}
                  style={{ marginTop: 4, fontSize: 12 }}
                >
                  {contextLabel}
                </Text>
              ) : null}
            </View>
            <IncognitoToggle
              on={incognito}
              label={incognito ? t("incognitoOn") : t("incognito")}
              onToggle={toggleIncognito}
              onMedia
            />
            <Pressable
              testID="madhav-close"
              accessibilityRole="button"
              accessibilityLabel={t("closeMadhav")}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.close,
                {
                  borderColor: mediaOverlay.ivoryHairline,
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
              {incognito ? t("incognitoHint") : t("madhavCompanionLine")}
            </Text>
          </View>
          {!incognito && isSignedIn && recentSessions.length > 0 ? (
            <View style={styles.sessionBar}>
              <Pressable
                onPress={() => setShowSessions((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={t("openChatHistory")}
                style={[
                  styles.sessionChip,
                  {
                    borderColor: mediaOverlay.ivoryHairline,
                    backgroundColor: showSessions
                      ? mediaOverlay.brassFill
                      : mediaOverlay.voidSoft,
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
                      borderColor: mediaOverlay.ivoryHairline,
                      backgroundColor: mediaOverlay.voidSoft,
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
        ) : (
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.navBg,
                paddingBottom: spacing.sm,
              },
            ]}
          >
            <Image
              source={images.madhavPortrait}
              style={styles.portrait}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text variant="title" color={colors.brassSoft} style={styles.madhavName}>
                {t("madhav")}
              </Text>
              {chartGrounded && contextLabel ? (
                <ChartContextChip
                  label={contextLabel}
                  clearLabel={t("chartClear")}
                  onClear={clearChartGrounding}
                />
              ) : contextLabel ? (
                <Text variant="muted" color={colors.brassSoft} style={{ marginTop: 2, fontSize: 12 }}>
                  {contextLabel}
                </Text>
              ) : null}
            </View>
            <IncognitoToggle
              on={incognito}
              label={incognito ? t("incognitoOn") : t("incognito")}
              onToggle={toggleIncognito}
            />
            <Pressable
              testID="madhav-close"
              accessibilityRole="button"
              accessibilityLabel={t("closeMadhav")}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.close,
                {
                  borderColor: colors.line,
                  opacity: pressed ? 0.55 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 22, lineHeight: 24 }}>
                ×
              </Text>
            </Pressable>
          </View>
        )}

        {!incognito &&
        (showSessions ||
          (isSignedIn &&
            recentSessions.length > 0 &&
            !inActiveChat &&
            !pendingPrompt)) ? (
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
                  (s.title?.trim() || t("conversation"));
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
            testID="madhav-crisis"
            style={[
              styles.crisis,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}
          >
            <Text variant="eyebrow" style={{ color: colors.danger }}>
              {t("crisisSupport")}
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
          <View style={{ paddingHorizontal: spacing.md }}>
            <EmptyState
              title={t("couldntLoad")}
              body={error}
              actionLabel={lastPromptRef.current ? t("retry") : undefined}
              onAction={lastPromptRef.current ? retryLastPrompt : undefined}
            />
          </View>
        ) : null}

        {showChartInvite ? (
          <View
            style={[
              styles.invite,
              { borderColor: colors.line, backgroundColor: colors.panel },
            ]}
          >
            <Text variant="title" style={{ fontSize: 18 }}>
              {t("chartInviteTitle")}
            </Text>
            <Text variant="soft" style={{ marginTop: spacing.sm }}>
              {t("chartInviteBody")}
            </Text>
            <View style={styles.inviteActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chartInviteCta")}
                onPress={() => router.push("/(tabs)/astrology")}
                style={[
                  styles.inviteCta,
                  { backgroundColor: colors.brass },
                ]}
              >
                <Text style={{ color: colors.onBrass, fontFamily: "Sora_600SemiBold" }}>
                  {t("chartInviteCta")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("chartInviteDismiss")}
                onPress={dismissChartInvite}
                hitSlop={8}
              >
                <Text variant="muted" color={colors.brassSoft}>
                  {t("chartInviteDismiss")}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showStarters ? (
          <View style={styles.starters}>
            {starters.map((starter) => (
              <Pressable
                key={starter}
                onPress={() => void sendMessage(starter)}
                disabled={loading}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.starterChip,
                  {
                    borderColor: colors.line,
                    backgroundColor: colors.panel,
                    opacity: pressed || loading ? 0.6 : 1,
                  },
                ]}
              >
                <Text variant="soft" style={styles.starterText}>
                  {starter}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <KeyboardStickyView>
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
            testID="madhav-input"
            value={input}
            onChangeText={setInput}
            placeholder={fillName(t("composerPlaceholder"), addressName)}
            placeholderTextColor={colors.textMuted}
            multiline
            {...multilineInputProps}
            onFocus={() => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToEnd({ animated: true });
              });
            }}
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
            testID="madhav-send"
            accessibilityRole="button"
            accessibilityLabel={t("send")}
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
        </KeyboardStickyView>
      </View>
    </Screen>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  headerHero: {
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: mediaOverlay.brassFill,
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
    borderColor: mediaOverlay.brassBorder,
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
  incognitoToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    maxWidth: 128,
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
  starters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  starterChip: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "100%",
  },
  starterText: {
    fontSize: 13,
    lineHeight: 18,
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
  invite: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  inviteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  inviteCta: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chartChip: {
    marginTop: 6,
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
