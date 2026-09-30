import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, setSession, constantTimeCompare, checkRateLimit } from "@/lib/auth";
import { getAdminUser, getAdminPasswordHash } from "@/lib/env";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validated = loginSchema.parse(body);
    const { username, password } = validated;

    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Rate limiting
    const rateLimitResult = await checkRateLimit(ip);
    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.reset 
        ? Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        : 900; // Default to 15 minutes
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Admin login
    const adminUser = getAdminUser();
    const adminPasswordHash = getAdminPasswordHash();
    
    if (!constantTimeCompare(username.toLowerCase(), adminUser.toLowerCase())) {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, adminPasswordHash);
    if (!isValid) {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create admin session
    const token = await createSession("admin", username);
    await setSession(token);

    return NextResponse.json({
      success: true,
      role: "admin",
      sub: username,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error("[api/auth/login] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
