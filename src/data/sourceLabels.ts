export const SOURCE_LABELS = [
  "friend",
  "friends",
  "information",
  "info",
  "classroom",
  "class",
  "classe",
  "walk in",
  "walk-in",
  "referral",
  "social media",
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "twitter",
  "whatsapp",
  "google",
  "youtube",
  "website",
  "event",
  "poster",
  "flyer",
  "banner",
  "brochure",
  "other",
  "unknown",
  "none",
  "n/a",
  "",
  "ami",
  "amis",
  "information",
  "salle de classe",
  "bouche a oreille",
  "affiche",
];

export const RAW_SOURCE_LABELS = SOURCE_LABELS;

export function normalizeString(str: string): string {
  if (!str) return "";

  let normalized = str.toLowerCase().trim();
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  normalized = normalized.replace(/[\p{P}\p{S}]/gu, " ");
  normalized = normalized.replace(/[_]+/g, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();

  if (normalized.length > 1 && normalized.endsWith("s") && !normalized.endsWith("ss")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

const PREFIX_RULES = ["heard by", "from", "via", "through"];
export const NORMALIZED_SOURCE_LABELS = new Set(SOURCE_LABELS.map(normalizeString).filter(Boolean));

export function isSourceLabel(name: string): boolean {
  if (!name || name.trim() === "") return true;

  const normalized = normalizeString(name);
  if (normalized === "") return true;
  if (NORMALIZED_SOURCE_LABELS.has(normalized)) return true;

  for (const prefix of PREFIX_RULES) {
    const normPrefix = normalizeString(prefix);
    if (normalized === normPrefix || normalized.startsWith(`${normPrefix} `)) {
      return true;
    }
  }

  return false;
}
