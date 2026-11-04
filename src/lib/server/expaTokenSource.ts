const HARDCODED_FALLBACK_TOKEN = "xsroH801QXztzPYUER21OXyKHP3tjQXn7yev-uS9GVA";

export function getExpaToken(): string | undefined {
  return process.env.EXPA_API_TOKEN || HARDCODED_FALLBACK_TOKEN || undefined;
}
