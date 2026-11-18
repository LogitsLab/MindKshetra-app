/** Public brand destinations mirrored from the web `lib/brand-links.ts`. */

export const WEBSITE_URL = "https://mindkshetra.in";
export const PRIVACY_URL = "https://mindkshetra.in/privacy";
export const SUPPORT_URL = "https://mindkshetra.in/support";
export const SUPPORT_EMAIL = "info@logitslab.com";
export const INSTAGRAM_URL = "https://www.instagram.com/mindkshetra_/";
export const INSTAGRAM_HANDLE = "@mindkshetra_";
export const WHATSAPP_CHANNEL_FALLBACK =
  "https://whatsapp.com/channel/0029Vb9JeuR1HspuQB3jn61u";

export type BrandLink = {
  id: string;
  labelKey: string;
  href: string;
};

export function brandLinkRows(opts?: {
  whatsapp?: string | null;
  instagram?: string | null;
}): { id: string; label: string; href: string }[] {
  const whatsapp = opts?.whatsapp || WHATSAPP_CHANNEL_FALLBACK;
  const instagram = opts?.instagram || INSTAGRAM_URL;
  return [
    { id: "website", label: "Website", href: WEBSITE_URL },
    { id: "whatsapp", label: "WhatsApp Channel", href: whatsapp },
    { id: "instagram", label: `Instagram ${INSTAGRAM_HANDLE}`, href: instagram },
    { id: "support", label: "Support", href: SUPPORT_URL },
    { id: "privacy", label: "Privacy", href: PRIVACY_URL },
    { id: "email", label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  ];
}
