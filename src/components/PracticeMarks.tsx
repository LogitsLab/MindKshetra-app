import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Panel } from "@/components/Panel";
import { Text } from "@/components/Text";
import { MilestoneMark } from "@/components/MilestoneMarks";
import { accountApi } from "@/api/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import {
  milestonesFor,
  nextMilestone,
  type Milestone,
  type MilestoneStats,
} from "@/data/milestones";
import {
  getGuestProgress,
  getMilestonesSeen,
  getSadhanaLog,
  setMilestonesSeen,
} from "@/storage/local";
import { spacing } from "@/theme/tokens";

export type MilestoneSummary = {
  visitCurrent: number;
  visitLongest: number;
  versesRead: number;
  /** null when the corpus size is unknown (device-local computation). */
  totalVerses: number | null;
  japaLifetimeCount: number;
};

export type MilestoneState = {
  guest: boolean;
  milestones: Milestone[];
  next: Milestone | null;
  summary: MilestoneSummary;
};

/**
 * What a device with no session can honestly say about itself: lifetime japa
 * beads off the local practice log, and verses read off guest progress.
 *
 * Deliberately no streaks. The server folds them with grace days, and a second
 * implementation here would sooner or later disagree with the account — a mark
 * that means two things is worse than a mark withheld. The panel invites
 * sign-in for the rest.
 */
async function localStats(): Promise<MilestoneStats> {
  let japaLifetimeCount = 0;
  try {
    for (const entry of await getSadhanaLog()) {
      if (entry.practice === "japa") japaLifetimeCount += Number(entry.count) || 0;
    }
  } catch {
    japaLifetimeCount = 0;
  }
  let versesRead = 0;
  try {
    versesRead = (await getGuestProgress()).completed.length;
  } catch {
    versesRead = 0;
  }
  return { japaLifetimeCount, versesRead };
}

async function loadLocalState(): Promise<MilestoneState> {
  const stats = await localStats();
  return {
    guest: true,
    milestones: milestonesFor(stats),
    next: nextMilestone(stats),
    summary: {
      visitCurrent: 0,
      visitLongest: 0,
      versesRead: stats.versesRead ?? 0,
      totalVerses: null,
      japaLifetimeCount: stats.japaLifetimeCount ?? 0,
    },
  };
}

/**
 * Server aggregate when there is a session — including an anonymous one, whose
 * practice rows are as real as anyone's — and the device view otherwise.
 */
export async function loadMilestoneState(): Promise<MilestoneState> {
  try {
    const data = await accountApi.milestones();
    if (!data.guest && data.summary) {
      return {
        guest: false,
        milestones: data.milestones ?? [],
        next: data.next ?? null,
        summary: data.summary,
      };
    }
  } catch {
    /* fall through to the device-local view */
  }
  return loadLocalState();
}

/**
 * At most ONE newly-crossed milestone for a completion moment. Everything
 * earned is remembered on this device, so a mark announces itself exactly once.
 * On a device that has never seen the ledger a long history backfills silently
 * — only a single earned mark (a genuinely fresh practice) shows.
 */
export async function takeNewMilestone(): Promise<Milestone | null> {
  try {
    const state = await loadMilestoneState();
    const earnedKeys = state.milestones.map((m) => m.key);
    const seen = await getMilestonesSeen();
    if (seen === null) {
      await setMilestonesSeen(earnedKeys);
      return state.milestones.length === 1 ? state.milestones[0] : null;
    }
    const fresh = state.milestones.filter((m) => !seen.includes(m.key));
    await setMilestonesSeen([...seen, ...earnedKeys]);
    return fresh[0] ?? null;
  } catch {
    // A completion moment must never fail because a mark could not be read.
    return null;
  }
}

/** The one-sentence brass moment line shown after a sit or a finished mala. */
export function MilestoneLine({ milestone }: { milestone: Milestone }) {
  const { colors } = useTheme();
  const { lang } = useLanguage();
  const text = lang === "hi" ? milestone.hi : milestone.en;
  return (
    <View style={styles.line}>
      <MilestoneMark motif={milestone.motif} size={22} />
      <Text variant="soft" color={colors.brassSoft} style={styles.lineText}>
        {text.name} · {text.line}
      </Text>
    </View>
  );
}

/** The account panel: every mark this practice has earned. */
export function PracticeMarks() {
  const { colors } = useTheme();
  const { t, lang } = useLanguage();
  const { user, loading } = useAuth();
  const [state, setState] = useState<MilestoneState | null>(null);

  useEffect(() => {
    if (loading) return;
    let alive = true;
    void (async () => {
      const next = user ? await loadMilestoneState() : await loadLocalState();
      if (alive) setState(next);
    })();
    return () => {
      alive = false;
    };
  }, [user, loading]);

  if (!state) return null;

  const { milestones, next, summary } = state;
  const nextText = next ? (lang === "hi" ? next.hi : next.en) : null;
  const hasSummary = summary.visitLongest > 0 || summary.totalVerses !== null;

  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text variant="eyebrow" color={colors.brassSoft}>
        {t("marksTitle")}
      </Text>
      <Text variant="muted" style={{ marginTop: spacing.sm }}>
        {t("marksBlurb")}
      </Text>

      <Panel style={{ marginTop: spacing.md }}>
        {hasSummary ? (
          <View
            style={[
              styles.summary,
              {
                borderBottomColor: colors.hairline,
                borderBottomWidth: milestones.length
                  ? StyleSheet.hairlineWidth * 2
                  : 0,
              },
            ]}
          >
            {summary.visitLongest > 0 ? (
              <Text variant="soft">
                {t("marksStreakLine")
                  .replace("{longest}", String(summary.visitLongest))
                  .replace("{current}", String(summary.visitCurrent))}
              </Text>
            ) : null}
            {summary.totalVerses !== null ? (
              <Text variant="soft">
                {t("marksVersesLine")
                  .replace("{n}", String(summary.versesRead))
                  .replace("{total}", String(summary.totalVerses))}
              </Text>
            ) : null}
          </View>
        ) : null}

        {milestones.length > 0 ? (
          <View style={styles.grid}>
            {milestones.map((m) => {
              const text = lang === "hi" ? m.hi : m.en;
              return (
                <View key={m.key} style={styles.cell}>
                  <MilestoneMark motif={m.motif} opacity={0.8} />
                  <Text style={{ marginTop: spacing.sm, fontSize: 14 }}>
                    {text.name}
                  </Text>
                  <Text variant="muted" style={{ marginTop: spacing.xs }}>
                    {text.line}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text variant="soft">{t("marksEmpty")}</Text>
        )}

        {nextText ? (
          <Text variant="muted" style={{ marginTop: spacing.md }}>
            {t("marksNext").replace("{name}", nextText.name)}
          </Text>
        ) : null}

        {state.guest && milestones.length > 0 ? (
          <Text
            variant="muted"
            style={[
              styles.guestHint,
              {
                borderTopColor: colors.hairline,
                borderTopWidth: StyleSheet.hairlineWidth * 2,
              },
            ]}
          >
            {t("marksGuestHint")}
          </Text>
        ) : null}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  lineText: {
    flex: 1,
  },
  summary: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  grid: {
    gap: spacing.lg,
  },
  cell: {
    gap: 0,
  },
  guestHint: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
});
