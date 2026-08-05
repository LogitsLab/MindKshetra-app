/**
 * Line-art mood glyphs (mirrors MindKshetra/public/icons/moods).
 * Colored at render time by replacing currentColor.
 */
export const moodSvgXml: Record<string, string> = {
  anxious:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M18 22h2M28 22h2M17 30c2.5-2 5-3 7-3s4.5 1 7 3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M24 8v4M10 18l3 2M38 18l-3 2" stroke="currentColor" stroke-width="1" opacity=".5"/></svg>',
  sad: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><circle cx="18" cy="22" r="1.2" fill="currentColor"/><circle cx="30" cy="22" r="1.2" fill="currentColor"/><path d="M18 32c2-2.5 4.5-3.5 6-3.5s4 1 6 3.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M30 18c0 3 2 5 2 7" stroke="currentColor" stroke-width="1" opacity=".45" stroke-linecap="round"/></svg>',
  angry:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M16 18l6 3M32 18l-6 3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M18 32c2.5 2 4.5 3 6 3s3.5-1 6-3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  confused:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M19 20c0-2.5 2-4 5-4s5 1.8 5 4c0 2.5-2 3.2-5 4v2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><circle cx="24" cy="34" r="1.2" fill="currentColor"/></svg>',
  grieving:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M24 10c6 8 12 12 12 20a12 12 0 11-24 0c0-8 6-12 12-20z" stroke="currentColor" stroke-width="1.25"/><path d="M24 28v8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  lonely:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="7" stroke="currentColor" stroke-width="1.25"/><path d="M14 38c2-7 6-10 10-10s8 3 10 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><circle cx="38" cy="14" r="2" stroke="currentColor" stroke-width="1" opacity=".4"/></svg>',
  overwhelmed:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M8 28c4-8 8-12 16-12s12 4 16 12" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M12 34c3-5 6-8 12-8s9 3 12 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity=".7"/><path d="M16 40c2-3 4-5 8-5s6 2 8 5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity=".45"/></svg>',
  guilty:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M24 16v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="32" r="1.3" fill="currentColor"/></svg>',
  jealous:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M24 12l3.5 8h8.5l-7 5.5 2.5 8.5L24 29l-7.5 5 2.5-8.5-7-5.5h8.5L24 12z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>',
  unmotivated:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M17 22h3M28 22h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18 32h12" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  fearful:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><circle cx="18" cy="22" r="2" fill="currentColor"/><circle cx="30" cy="22" r="2" fill="currentColor"/><path d="M19 31h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M24 8l1 4M12 14l3 2" stroke="currentColor" stroke-width="1" opacity=".45"/></svg>',
  hopeful:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="20" r="8" stroke="currentColor" stroke-width="1.25"/><path d="M24 10V6M16 14l-3-3M32 14l3-3M12 20H8M40 20h-4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M14 36c3-6 6-8 10-8s7 2 10 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  grateful:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M24 38c-8-6-12-12-12-18a8 8 0 0116 0 8 8 0 0116 0c0 6-4 12-12 18l-4 3-4-3z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>',
  "big-decision":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M24 8v12M24 28v12" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M14 20l10 8 10-8" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><circle cx="14" cy="18" r="3" stroke="currentColor" stroke-width="1.1"/><circle cx="34" cy="18" r="3" stroke="currentColor" stroke-width="1.1"/></svg>',
  conflict:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><path d="M14 34L24 12l10 22H14z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M24 22v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="24" cy="33" r="1.2" fill="currentColor"/></svg>',
  failure:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M18 18l12 12M30 18L18 30" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
  purpose:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="6" stroke="currentColor" stroke-width="1.25"/><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1" opacity=".5"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
  happy:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><path d="M17 22c.5-1.5 1.5-2.5 3-2.5s2.5 1 3 2.5M25 22c.5-1.5 1.5-2.5 3-2.5s2.5 1 3 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M17 28c2.5 3.5 5.5 5 7 5s4.5-1.5 7-5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>',
};

const fallbackSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="14" stroke="currentColor" stroke-width="1.25"/><circle cx="24" cy="24" r="3" fill="currentColor"/></svg>';

export function moodIconXml(id: string, color: string): string {
  const base = moodSvgXml[id] ?? fallbackSvg;
  return base.replace(/currentColor/g, color);
}
