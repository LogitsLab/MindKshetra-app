import React from "react";
import { View, type StyleProp, type TextStyle } from "react-native";
import { Text } from "@/components/Text";
import { spacing } from "@/theme/tokens";

/**
 * Minimal Markdown renderer for LLM replies (Madhav + chart readings).
 * The model emits `**bold**`, `*`/`-` bullets, `#` headings and blank-line
 * paragraphs; rendered as plain <Text> these leaked literal asterisks/hashes to
 * the user. This handles exactly that subset — no tables, links or code blocks,
 * which the replies never use.
 */

type Variant = "body" | "soft" | "muted";

const BOLD_FONT = "Sora_600SemiBold";

/** Split a line on `**bold**`, returning Text-safe children. */
function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <Text key={`b${i}`} style={{ fontFamily: BOLD_FONT }}>
        {m[1]}
      </Text>
    );
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownText({
  text,
  variant = "body",
  color,
  style,
}: {
  text: string;
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let prevBlank = false;
  let key = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      prevBlank = true;
      continue;
    }
    const marginTop =
      blocks.length === 0 ? 0 : prevBlank ? spacing.sm : 4;
    prevBlank = false;

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <Text
          key={key++}
          variant={variant}
          color={color}
          style={[style, { marginTop, fontFamily: BOLD_FONT }]}
        >
          {inline(heading[1])}
        </Text>
      );
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={key++} style={{ flexDirection: "row", marginTop }}>
          <Text variant={variant} color={color} style={[style, { marginRight: 6 }]}>
            {"•"}
          </Text>
          <Text variant={variant} color={color} style={[style, { flex: 1 }]}>
            {inline(bullet[1])}
          </Text>
        </View>
      );
      continue;
    }

    blocks.push(
      <Text key={key++} variant={variant} color={color} style={[style, { marginTop }]}>
        {inline(line)}
      </Text>
    );
  }

  return <View>{blocks}</View>;
}
