/**
 * Daily practice: japa counter and the composed sadhana flow. Kept apart from
 * gita/astrology so practice copy can evolve without churning those files.
 */
export const en = {
  homeJapaTitle: "Japa",
  homeJapaBody: "Count a quiet mala",
  japaTapHint: "Tap anywhere to count a bead",
  japaOf108: "of 108",
  japaMalaOne: "1 mala completed",
  japaMalaMany: "{n} malas completed",
  japaChangeMantra: "Change mantra",
  japaPickTitle: "Choose a mantra",
  japaFinish: "Finish",
} as const;

export const hi: Record<keyof typeof en, string> = {
  homeJapaTitle: "जप",
  homeJapaBody: "एक शांत माला जपें",
  japaTapHint: "मनका गिनने के लिए कहीं भी छुएँ",
  japaOf108: "108 में से",
  japaMalaOne: "1 माला पूर्ण",
  japaMalaMany: "{n} मालाएँ पूर्ण",
  japaChangeMantra: "मंत्र बदलें",
  japaPickTitle: "मंत्र चुनें",
  japaFinish: "समाप्त करें",
};
