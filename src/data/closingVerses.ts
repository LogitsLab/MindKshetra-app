/**
 * A small, bundled set of steadying Gītā lines shown to close a practice — a
 * verse "to carry" after a sit or a breath. Kept in-app (not fetched) so the
 * closing moment works fully offline, and deliberately short and calming rather
 * than doctrinal. `chapter`/`verse` let the card link into the reader.
 */
export type ClosingVerse = {
  ref: string;
  chapter: number;
  verse: number;
  en: string;
  hi: string;
};

export const closingVerses: ClosingVerse[] = [
  {
    ref: "2.47",
    chapter: 2,
    verse: 47,
    en: "You have a right to your action alone, never to its fruits. Let not the fruit be your motive, nor cling to inaction.",
    hi: "कर्म करने में ही तुम्हारा अधिकार है, उसके फल में कभी नहीं। फल की इच्छा तुम्हारा हेतु न बने, और न ही अकर्म में आसक्ति हो।",
  },
  {
    ref: "2.48",
    chapter: 2,
    verse: 48,
    en: "Steadfast in yoga, do your work, letting go of attachment; even-minded in success and failure. Evenness of mind is yoga.",
    hi: "योग में स्थित होकर, आसक्ति त्यागकर कर्म करो; सिद्धि और असिद्धि में समान रहो। मन की यही समता योग है।",
  },
  {
    ref: "6.5",
    chapter: 6,
    verse: 5,
    en: "Lift yourself by yourself; do not let yourself sink. For you alone are your friend, and you alone your foe.",
    hi: "अपने द्वारा अपना उद्धार करो, स्वयं को गिरने न दो; क्योंकि तुम ही अपने मित्र हो और तुम ही अपने शत्रु।",
  },
  {
    ref: "2.14",
    chapter: 2,
    verse: 14,
    en: "Heat and cold, pleasure and pain arise from the senses' touch. They come and go, impermanent. Learn to endure them.",
    hi: "इन्द्रियों के संयोग से शीत-उष्ण, सुख-दुःख उत्पन्न होते हैं। ये आते-जाते हैं, अनित्य हैं। इन्हें सहना सीखो।",
  },
  {
    ref: "6.35",
    chapter: 6,
    verse: 35,
    en: "The mind is restless, hard to hold — yet by steady practice and by letting go, it can be stilled.",
    hi: "मन चंचल है और कठिनाई से वश में होता है — फिर भी निरंतर अभ्यास और वैराग्य से यह शांत हो जाता है।",
  },
  {
    ref: "12.15",
    chapter: 12,
    verse: 15,
    en: "One by whom the world is not troubled, and who is not troubled by the world — free of joy's rush and fear — is dear to Me.",
    hi: "जिससे संसार क्षुब्ध नहीं होता और जो संसार से क्षुब्ध नहीं होता, हर्ष और भय से मुक्त — वह मुझे प्रिय है।",
  },
  {
    ref: "2.70",
    chapter: 2,
    verse: 70,
    en: "As rivers enter the ocean, which stays still though ever filled, so peace comes to one whom desires enter yet leave unmoved.",
    hi: "जैसे नदियाँ समुद्र में समाती हैं पर वह अचल रहता है, वैसे ही जिसमें इच्छाएँ समाकर भी उसे विचलित नहीं करतीं, वही शांति पाता है।",
  },
  {
    ref: "9.22",
    chapter: 9,
    verse: 22,
    en: "To those ever steadfast, who worship Me with love, I bring what they lack and keep safe what they hold.",
    hi: "जो सदा एकनिष्ठ होकर प्रेमपूर्वक मेरा स्मरण करते हैं, उनका योगक्षेम मैं स्वयं वहन करता हूँ।",
  },
];

/** Deterministic pick so the same sit always closes with the same verse. */
export function closingVerseFor(seed: number): ClosingVerse {
  const len = closingVerses.length;
  const idx = ((Math.trunc(seed) % len) + len) % len;
  return closingVerses[idx];
}
