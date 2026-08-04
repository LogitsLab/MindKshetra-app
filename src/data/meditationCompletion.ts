export const POST_MOOD_CHOICES = [
  { value: 4, labelKey: "medMoodGreat" },
  { value: 3, labelKey: "medMoodGood" },
  { value: 2, labelKey: "medMoodNeutral" },
  { value: 1, labelKey: "medMoodLow" },
] as const;

export type PostMoodValue = (typeof POST_MOOD_CHOICES)[number]["value"];

/**
 * The completion screen is a four-point check-in. Keep this mapping separate
 * from display copy so English and Hindi submit the same stable API values.
 */
export function postMoodValueFor(
  labelKey: (typeof POST_MOOD_CHOICES)[number]["labelKey"]
): PostMoodValue {
  return POST_MOOD_CHOICES.find((choice) => choice.labelKey === labelKey)!.value;
}
