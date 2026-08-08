import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import type { AppLang } from "@/i18n/dictionary";
import { mentionsCrisisResource } from "@/safety/crisis";
import { radii, spacing } from "@/theme/tokens";
import type { ThemeColors } from "@/theme/tokens";
import type { Citation } from "@/types";

function citationSnippet(c: Citation, lang: AppLang): string {
  const text = (lang === "hi" && c.hindi ? c.hindi : c.english)?.trim() ?? "";
  return text.replace(/\s+/g, " ");
}

type Props = {
  isUser: boolean;
  content: string;
  chartEpigraph?: string;
  citations?: Citation[];
  /** Pre-translated speaker label ("You" / "Madhav"). */
  label: string;
  /** Label for the practice / sādhana action on a citation. */
  practiceLabel?: string;
  lang: AppLang;
  loading: boolean;
  multiplier: number;
  colors: ThemeColors;
  onPressCitation: (id: Citation["id"]) => void;
  onPracticeCitation?: (id: Citation["id"]) => void;
};

/**
 * One chat row, memoized so token-stream updates to the last message do not
 * re-render every earlier bubble in the list.
 */
export const MessageBubble = React.memo(function MessageBubble({
  isUser,
  content,
  chartEpigraph,
  citations,
  label,
  practiceLabel,
  lang,
  loading,
  multiplier,
  colors,
  onPressCitation,
  onPracticeCitation,
}: Props) {
  const crisis = !isUser && mentionsCrisisResource(content);

  if (isUser) {
    return (
      <View
        style={[
          styles.userBubble,
          { backgroundColor: colors.panelStrong, borderColor: colors.hairline },
        ]}
      >
        <Text variant="body">{content}</Text>
      </View>
    );
  }

  return (
    <View style={styles.response}>
      <View style={styles.responseLabel}>
        <View style={[styles.responseDot, { backgroundColor: colors.brass }]} />
        <Text variant="eyebrow" style={{ color: colors.textMuted }}>
          {label}
        </Text>
      </View>
      {chartEpigraph ? (
        <View style={styles.epigraph}>
          <Text
            variant="title"
            style={{
              color: colors.brassSoft,
              fontFamily: "Fraunces_500Medium",
              fontStyle: "italic",
              fontSize: 17 * multiplier,
              lineHeight: 25 * multiplier,
            }}
          >
            “{chartEpigraph}”
          </Text>
          <View style={[styles.epigraphRule, { backgroundColor: colors.line }]} />
        </View>
      ) : null}
      <View
        style={[
          styles.teaching,
          {
            backgroundColor: colors.panelStrong,
            borderColor: crisis ? colors.danger : colors.line,
          },
        ]}
      >
        <Text
          variant="body"
          style={{ color: crisis ? colors.danger : colors.textSoft }}
        >
          {content || (loading ? "…" : "")}
        </Text>
      </View>
      {citations && citations.length > 0 ? (
        <View style={styles.cites}>
          {citations.slice(0, 4).map((c) => {
            const snippet = citationSnippet(c, lang);
            return (
              <View
                key={String(c.id)}
                style={[styles.citeRow, { borderBottomColor: colors.hairline }]}
              >
                <Pressable
                  onPress={() => onPressCitation(c.id)}
                  style={styles.citeMain}
                  accessibilityRole="link"
                >
                  <Text
                    variant="muted"
                    style={{
                      color: colors.brassSoft,
                      fontFamily: "Sora_600SemiBold",
                      fontSize: 12 * multiplier,
                      lineHeight: 16 * multiplier,
                    }}
                  >
                    {c.ref || `Verse ${c.id}`}
                  </Text>
                  {snippet ? (
                    <Text
                      variant="muted"
                      style={{
                        marginTop: 4,
                        color: colors.textSoft,
                        fontSize: 13 * multiplier,
                        lineHeight: 18 * multiplier,
                      }}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {snippet}
                    </Text>
                  ) : null}
                </Pressable>
                {onPracticeCitation && practiceLabel ? (
                  <Pressable
                    onPress={() => onPracticeCitation(c.id)}
                    accessibilityRole="button"
                    accessibilityLabel={practiceLabel}
                    hitSlop={8}
                    style={[
                      styles.practiceBtn,
                      { borderColor: colors.line, backgroundColor: colors.surface },
                    ]}
                  >
                    <Text
                      variant="muted"
                      style={{
                        color: colors.brassSoft,
                        fontFamily: "Sora_600SemiBold",
                        fontSize: 11 * multiplier,
                      }}
                    >
                      {practiceLabel}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  userBubble: {
    maxWidth: "85%",
    alignSelf: "flex-end",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  response: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
  responseLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  responseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },
  epigraph: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    marginBottom: spacing.md,
  },
  epigraphRule: {
    width: 48,
    height: StyleSheet.hairlineWidth * 2,
    marginTop: spacing.sm,
  },
  teaching: {
    marginLeft: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  cites: {
    marginLeft: spacing.lg,
    marginTop: spacing.md,
    gap: 2,
  },
  citeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  citeMain: {
    flex: 1,
    minWidth: 0,
  },
  practiceBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
