import { describe, it, expect } from 'vitest';

// Pure function version of proxy logic for testing
export function getProxyRedirect(
  pathname: string,
  session: { role: 'admin' | 'member' | null } | null
): { redirect: string | null; statusCode: number } {
  // Public routes - no auth required
  if (pathname === "/" || pathname.startsWith("/api/auth") || pathname === "/admin-login") {
    return { redirect: null, statusCode: 200 };
  }

  // If not authenticated, redirect to landing page with login flag
  if (!session) {
    return { redirect: "/?login=1", statusCode: 307 };
  }

  const role = session.role;

  // Admin dashboard - requires admin role
  // Members trying to access admin dashboard get redirected to member dashboard
  if (pathname.startsWith("/dashboard")) {
    if (role === "member") {
      return { redirect: "/member-dashboard", statusCode: 307 };
    }
    if (role !== "admin") {
      return { redirect: "/?login=1", statusCode: 307 };
    }
  }

  // Member dashboard - requires member or admin role
  if (pathname.startsWith("/member-dashboard")) {
    if (role !== "member" && role !== "admin") {
      return { redirect: "/?login=1", statusCode: 307 };
    }
  }

  return { redirect: null, statusCode: 200 };
}

/**
 * Validates a redirect URL to prevent open redirect attacks.
 * Only accepts relative paths starting with a single "/".
 * Rejects absolute URLs, protocol-relative URLs (//), and malformed paths.
 */
export function isValidRedirect(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  // Must start with a single "/"
  if (!url.startsWith("/")) return false;
  
  // Reject protocol-relative URLs (//example.com)
  if (url.startsWith("//")) return false;
  
  // Reject absolute URLs (http://, https://, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false;
  
  // Reject paths with backslashes (Windows path separator)
  if (url.includes("\\")) return false;
  
  // Reject encoded null bytes
  if (url.includes("%00")) return false;
  
  // Ensure it's a valid path (no control characters)
  if (/[\x00-\x1F\x7F]/.test(url)) return false;
  
  return true;
}

describe('Proxy Redirect Logic', () => {
  describe('No session', () => {
    it('should allow access to public routes', () => {
      expect(getProxyRedirect("/", null)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/api/auth/login", null)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/api/auth/logout", null)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/admin-login", null)).toEqual({ redirect: null, statusCode: 200 });
    });

    it('should redirect to landing page with login flag for protected routes', () => {
      expect(getProxyRedirect("/dashboard", null)).toEqual({ redirect: "/?login=1", statusCode: 307 });
      expect(getProxyRedirect("/dashboard/leads", null)).toEqual({ redirect: "/?login=1", statusCode: 307 });
      expect(getProxyRedirect("/member-dashboard", null)).toEqual({ redirect: "/?login=1", statusCode: 307 });
      expect(getProxyRedirect("/member-dashboard/sales", null)).toEqual({ redirect: "/?login=1", statusCode: 307 });
    });
  });

  describe('Member session', () => {
    const memberSession = { role: 'member' as const };

    it('should allow access to member dashboard', () => {
      expect(getProxyRedirect("/member-dashboard", memberSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/member-dashboard/sales", memberSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/member-dashboard/ranking", memberSession)).toEqual({ redirect: null, statusCode: 200 });
    });

    it('should redirect member from admin dashboard to member dashboard', () => {
      expect(getProxyRedirect("/dashboard", memberSession)).toEqual({ redirect: "/member-dashboard", statusCode: 307 });
      expect(getProxyRedirect("/dashboard/leads", memberSession)).toEqual({ redirect: "/member-dashboard", statusCode: 307 });
    });

    it('should allow access to public routes', () => {
      expect(getProxyRedirect("/", memberSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/api/auth/me", memberSession)).toEqual({ redirect: null, statusCode: 200 });
    });
  });

  describe('Admin session', () => {
    const adminSession = { role: 'admin' as const };

    it('should allow access to admin dashboard', () => {
      expect(getProxyRedirect("/dashboard", adminSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/dashboard/leads", adminSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/dashboard/ranking", adminSession)).toEqual({ redirect: null, statusCode: 200 });
    });

    it('should allow access to member dashboard (admin can view both)', () => {
      expect(getProxyRedirect("/member-dashboard", adminSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/member-dashboard/sales", adminSession)).toEqual({ redirect: null, statusCode: 200 });
    });

    it('should allow access to public routes', () => {
      expect(getProxyRedirect("/", adminSession)).toEqual({ redirect: null, statusCode: 200 });
      expect(getProxyRedirect("/api/auth/me", adminSession)).toEqual({ redirect: null, statusCode: 200 });
    });
  });

  describe('Invalid session (no role)', () => {
    const invalidSession = { role: null };

    it('should redirect to landing page with login flag', () => {
      expect(getProxyRedirect("/dashboard", invalidSession)).toEqual({ redirect: "/?login=1", statusCode: 307 });
      expect(getProxyRedirect("/member-dashboard", invalidSession)).toEqual({ redirect: "/?login=1", statusCode: 307 });
    });
  });
});

describe('Redirect Safety Validation', () => {
  describe('Valid redirects', () => {
    it('should accept relative paths', () => {
      expect(isValidRedirect("/dashboard")).toBe(true);
      expect(isValidRedirect("/member-dashboard")).toBe(true);
      expect(isValidRedirect("/admin-login")).toBe(true);
      expect(isValidRedirect("/")).toBe(true);
      expect(isValidRedirect("/some/path")).toBe(true);
      expect(isValidRedirect("/path/with/segments")).toBe(true);
    });

    it('should accept paths with query parameters', () => {
      expect(isValidRedirect("/dashboard?tab=1")).toBe(true);
      expect(isValidRedirect("/member-dashboard?sort=name")).toBe(true);
    });

    it('should accept paths with hash fragments', () => {
      expect(isValidRedirect("/dashboard#section")).toBe(true);
    });
  });

  describe('Invalid redirects', () => {
    it('should reject absolute URLs', () => {
      expect(isValidRedirect("http://example.com")).toBe(false);
      expect(isValidRedirect("https://example.com")).toBe(false);
      expect(isValidRedirect("ftp://example.com")).toBe(false);
      expect(isValidRedirect("//example.com")).toBe(false);
    });

    it('should reject paths without leading slash', () => {
      expect(isValidRedirect("dashboard")).toBe(false);
      expect(isValidRedirect("relative/path")).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isValidRedirect("//evil.com")).toBe(false);
      expect(isValidRedirect("//example.com/path")).toBe(false);
    });

    it('should reject paths with backslashes', () => {
      expect(isValidRedirect("/\\evil\\path")).toBe(false);
      expect(isValidRedirect("/path\\with\\backslash")).toBe(false);
    });

    it('should reject encoded null bytes', () => {
      expect(isValidRedirect("/path%00evil")).toBe(false);
    });

    it('should reject control characters', () => {
      expect(isValidRedirect("/path\x00evil")).toBe(false);
      expect(isValidRedirect("/path\nevil")).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidRedirect("")).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidRedirect(null as any)).toBe(false);
      expect(isValidRedirect(undefined as any)).toBe(false);
      expect(isValidRedirect(123 as any)).toBe(false);
    });
  });
});
