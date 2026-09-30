import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { getSessionSecret } from "@/lib/sessionSecret";

type Role = "admin";

interface SessionPayload extends JWTPayload {
  role: Role;
  sub: string;
}

/**
 * Validates a redirect URL to prevent open redirect attacks.
 * Only accepts relative paths starting with a single "/".
 * Rejects absolute URLs, protocol-relative URLs (//), and malformed paths.
 */
function isValidRedirect(url: string): boolean {
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

async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    
    if (!token) return null;
    
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as SessionPayload;
  } catch {
    // If SESSION_SECRET is missing or invalid, treat as no session (fail closed)
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes - no auth required
  // /, /member-dashboard/*, /admin-login, and all API routes except admin-only ones
  if (pathname === "/" || pathname.startsWith("/member-dashboard") || pathname === "/admin-login" || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Admin dashboard - requires admin role
  if (pathname.startsWith("/dashboard")) {
    const session = await getSession();
    
    // If not authenticated or not admin, redirect to home
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|university-logos/|images/|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
