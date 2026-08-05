/** Clamp at a word/clause boundary so UI never mid-cuts a word. */
export function truncateAtWord(text: string, maxChars: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const boundary = Math.max(
    slice.lastIndexOf(" "),
    slice.lastIndexOf("—"),
    slice.lastIndexOf("-"),
    slice.lastIndexOf("।"),
    slice.lastIndexOf(","),
    slice.lastIndexOf("·")
  );
  const cut = boundary > maxChars * 0.55 ? slice.slice(0, boundary) : slice;
  return `${cut.replace(/[.,;:!?—·-]+$/u, "").trim()}…`;
}
