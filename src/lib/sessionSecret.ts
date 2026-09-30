/**
 * Minimal session secret access for middleware/proxy.
 * Only reads SESSION_SECRET from process.env to avoid loading env.ts.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long");
  }
  return secret;
}
