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
  lang: AppLang;
  loading: boolean;
  multiplier: number;
  colors: ThemeColors;
  onPressCitation: (id: Citation["id"]) => void;
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
  lang,
  loading,
  multiplier,
  colors,
  onPressCitation,
}: Props) {
  const crisis = !isUser && mentionsCrisisResource(content);

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
        {label}
      </Text>
      {chartEpigraph ? (
        <Text
          variant="title"
          style={{
            marginTop: spacing.sm,
            fontFamily: "Fraunces_500Medium",
            fontSize: 16 * multiplier,
            lineHeight: 24 * multiplier,
            borderLeftWidth: 2,
            borderLeftColor: colors.line,
            paddingLeft: spacing.sm,
          }}
        >
          {chartEpigraph}
        </Text>
      ) : null}
      <Text
        variant="body"
        style={{
          marginTop: spacing.sm,
          color: crisis ? colors.danger : colors.text,
        }}
      >
        {content || (loading ? "…" : "")}
      </Text>
      {citations && citations.length > 0 ? (
        <View style={[styles.cites, { borderTopColor: colors.hairline }]}>
          {citations.slice(0, 4).map((c) => {
            const snippet = citationSnippet(c, lang);
            return (
              <Pressable
                key={String(c.id)}
                onPress={() => onPressCitation(c.id)}
                style={[styles.citeRow, { borderBottomColor: colors.hairline }]}
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
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

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
    gap: 2,
  },
  citeRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
});
