import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import { getSessionSecret } from "@/lib/sessionSecret";

type Role = "admin" | "member";

interface SessionPayload extends JWTPayload {
  role: Role;
  sub: string;
  memberId?: string;
  name?: string;
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
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes - no auth required
  if (pathname === "/" || pathname.startsWith("/api/auth") || pathname === "/admin-login") {
    return NextResponse.next();
  }

  // Check session
  const session = await getSession();
  
  // If not authenticated, redirect to landing page with login flag
  if (!session) {
    const url = new URL("/", request.url);
    url.searchParams.set("login", "1");
    
    // Check for safe redirect parameter
    const nextParam = request.nextUrl.searchParams.get("next");
    if (nextParam && isValidRedirect(nextParam)) {
      url.searchParams.set("next", nextParam);
    }
    
    return NextResponse.redirect(url);
  }

  const role = session.role;

  // Admin dashboard - requires admin role
  // Members trying to access admin dashboard get redirected to member dashboard
  if (pathname.startsWith("/dashboard")) {
    if (role === "member") {
      return NextResponse.redirect(new URL("/member-dashboard", request.url));
    }
    if (role !== "admin") {
      const url = new URL("/", request.url);
      url.searchParams.set("login", "1");
      return NextResponse.redirect(url);
    }
  }

  // Member dashboard - requires member or admin role
  if (pathname.startsWith("/member-dashboard")) {
    if (role !== "member" && role !== "admin") {
      const url = new URL("/", request.url);
      url.searchParams.set("login", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
