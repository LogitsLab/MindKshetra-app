/**
 * Crisis detection for Madhav chat.
 *
 * Two different questions, deliberately kept apart:
 *
 *   detectUserCrisis(text)      — did the PERSON express distress or intent to
 *                                 harm themselves? Runs on the user's message at
 *                                 send time. This is the one that must never miss.
 *   mentionsCrisisResource(text) — did the MODEL already surface a helpline? Runs
 *                                 on assistant output so we do not stack a second
 *                                 banner on top of a reply that already helped.
 *
 * Before this module existed, only the second check ran, and it ran on the model's
 * reply. A user typing "I want to kill myself" produced no banner unless the model
 * happened to name a helpline. See the /autoplan review, finding F1.
 *
 * Deliberately conservative on false positives: a banner that fires on ordinary
 * verse discussion trains people to ignore it, which costs more than it saves.
 */

/**
 * Expressions of self-harm intent. Bare "die" / "kill" are never matched on their
 * own — "this deadline is killing me" and "I'm dying to know" must stay silent.
 */
const USER_CRISIS_PATTERNS: RegExp[] = [
  // English — intent
  /\b(kill|killing|killed)\s+my\s?self\b/i,
  /\b(end|ending|take|taking)\s+my\s+(own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
  /\b(want|wants|wanted|wanna|wish|wishing)\s+(to\s+)?(die|be\s+dead|not\s+wake\s+up)\b/i,
  // "wish I was dead" / "wish I were dead" / "wish I had never been born" — the
  // subject clause sits between the verb and the object, so the pattern above misses it.
  /\bwish(ing|ed)?\s+(i\s+(was|were|had)\s+)?(dead|never\s+(been\s+)?born)\b/i,
  /\b(don'?t|do\s+not|dont)\s+want\s+to\s+(live|be\s+alive|exist|wake\s+up)\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bsuicid(e|al)\b/i,

  // English — self-harm
  /\bself[-\s]?harm/i,
  /\b(hurt|hurting|harm|harming|cut|cutting)\s+my\s?self\b/i,

  // English — hopelessness with intent
  /\bno\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on)\b/i,
  /\b(can'?t|cannot|cant)\s+(go\s+on|do\s+this\s+any\s?more|keep\s+going)\b/i,

  // Hindi — intent
  /आत्महत्या/,
  /मरना\s*चाह/,
  /मर\s*(जाऊँ|जाऊं|जाउं|जाना\s*चाह)/,
  /जीना\s*नहीं\s*चाह/,
  /जान\s*दे\s*(दूँ|दूं|देना)/,
  /(ज़िंदगी|जिंदगी)\s*(ख़त्म|खत्म)\s*कर/,

  // Hindi — self-harm
  /(खुद|अपने\s*आप)\s*को\s*(नुकसान|चोट)/,
];

/**
 * Helpline strings the API or model may already have surfaced. Kept from the
 * original implementation so existing behavior is preserved, not replaced.
 */
const RESOURCE_PATTERNS: RegExp[] =
  [/helpline/i, /icall/i, /9152987821/, /vandrevala/i, /tele-?manas/i, /14416/, /आत्महत्या/, /आपतकाल/];

/** Did the user express distress or intent to harm themselves? */
export function detectUserCrisis(text: string): boolean {
  if (!text) return false;
  return USER_CRISIS_PATTERNS.some((re) => re.test(text));
}

/** Did this text already point at a crisis resource? */
export function mentionsCrisisResource(text: string): boolean {
  if (!text) return false;
  return RESOURCE_PATTERNS.some((re) => re.test(text));
}
