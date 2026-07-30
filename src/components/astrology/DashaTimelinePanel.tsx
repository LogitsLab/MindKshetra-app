import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/context/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { DashaPeriodNode } from "@/types/astrology";

type Props = {
  tree?: DashaPeriodNode[] | null;
  currentMaha?: { lord?: string; start?: string; end?: string } | null;
  currentAntar?: { lord?: string; start?: string; end?: string } | null;
  emptyLabel: string;
  currentLabel: string;
};

export function DashaTimelinePanel({
  tree,
  currentMaha,
  currentAntar,
  emptyLabel,
  currentLabel,
}: Props) {
  const { colors } = useTheme();
  const [openLord, setOpenLord] = useState<string | null>(
    currentMaha?.lord ?? null
  );

  const mahas = (tree ?? []).filter((p) => p.level === "maha" || !p.level);

  if (!mahas.length && !currentMaha) {
    return <Text variant="muted">{emptyLabel}</Text>;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {currentMaha?.lord ? (
        <Text variant="soft" style={{ color: colors.brassSoft }}>
          {currentLabel}: {currentMaha.lord}
          {currentAntar?.lord ? `–${currentAntar.lord}` : ""}
          {currentMaha.start && currentMaha.end
            ? ` · ${currentMaha.start} → ${currentMaha.end}`
            : ""}
        </Text>
      ) : null}

      {(mahas.length ? mahas : currentMaha?.lord
        ? [
            {
              lord: currentMaha.lord!,
              start: currentMaha.start ?? "",
              end: currentMaha.end ?? "",
              children: [],
            },
          ]
        : []
      ).map((maha) => {
        const open = openLord === maha.lord;
        return (
          <View key={`${maha.lord}-${maha.start}`}>
            <Pressable
              onPress={() => setOpenLord(open ? null : maha.lord)}
              style={{
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.hairline,
              }}
            >
              <Text variant="body">
                {open ? "▾ " : "▸ "}
                {maha.lord}
              </Text>
              <Text variant="muted">
                {maha.start} → {maha.end}
              </Text>
            </Pressable>
            {open && maha.children?.length
              ? maha.children.map((antar) => (
                  <View
                    key={`${antar.lord}-${antar.start}`}
                    style={{ paddingLeft: spacing.md, paddingVertical: 4 }}
                  >
                    <Text
                      variant="muted"
                      style={{
                        color:
                          currentAntar?.lord === antar.lord &&
                          currentAntar?.start === antar.start
                            ? colors.brassSoft
                            : colors.textMuted,
                      }}
                    >
                      {antar.lord}: {antar.start} → {antar.end}
                    </Text>
                  </View>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}
