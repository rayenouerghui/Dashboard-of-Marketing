import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "./env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type Role = "admin" | "member";

export interface SessionPayload extends JWTPayload {
  role: Role;
  sub: string; // username or memberId
  memberId?: string; // For members
  name?: string; // For members
}

const SESSION_COOKIE_NAME = "session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Rate limiting with Upstash Redis (fallback to in-memory for local development)
let ratelimit: Ratelimit | null = null;
let inMemoryRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// Initialize Upstash Redis if credentials are available
if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_ATTEMPTS, `${RATE_LIMIT_WINDOW} ms`),
    });
  } catch (error) {
    console.warn("[auth] Failed to initialize Upstash Redis, falling back to in-memory rate limiting:", error);
  }
} else {
  console.warn("[auth] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set, using in-memory rate limiting (not suitable for production)");
}

function getSecretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSession(role: Role, sub: string, memberId?: string, name?: string): Promise<string> {
  const now = Date.now();
  const payload: SessionPayload = {
    role,
    sub,
    ...(memberId && { memberId }),
    ...(name && { name }),
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + SESSION_DURATION) / 1000),
  };

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return await verifySession(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function setSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

export async function requireRole(requiredRole: Role): Promise<SessionPayload> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }
  
  // Admin can access everything
  if (session.role === "admin") {
    return session;
  }
  
  // Member can only access member routes
  if (requiredRole === "member" && session.role === "member") {
    return session;
  }
  
  // Member trying to access admin routes
  if (requiredRole === "admin" && session.role === "member") {
    throw new Error("Forbidden");
  }
  
  return session;
}

// Rate limiting helper
export async function checkRateLimit(identifier: string): Promise<{ success: boolean; reset?: number }> {
  // Use Upstash Redis if available
  if (ratelimit) {
    try {
      const { success, reset } = await ratelimit.limit(identifier);
      return { success, reset };
    } catch (error) {
      console.warn("[auth] Upstash rate limit check failed, falling back to in-memory:", error);
      // Fall through to in-memory
    }
  }
  
  // Fallback to in-memory rate limiting
  const now = Date.now();
  const record = inMemoryRateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    inMemoryRateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { success: true, reset: now + RATE_LIMIT_WINDOW };
  }
  
  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { success: false, reset: record.resetTime };
  }
  
  record.count++;
  return { success: true, reset: record.resetTime };
}

// Constant-time comparison for passwords
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
