const HARDCODED_FALLBACK_TOKEN = "bKcIC7YgZ4V7z9ZHIcaY4Opk4wgEHD72Supm73W_sps";

export function getExpaToken(): string | undefined {
  return process.env.EXPA_API_TOKEN || HARDCODED_FALLBACK_TOKEN || undefined;
}
