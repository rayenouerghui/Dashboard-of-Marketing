import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, setSession, constantTimeCompare, checkRateLimit, type Role } from "@/lib/auth";
import { getAdminUser, getAdminPasswordHash } from "@/lib/env";
import { verifyMemberAccessCode } from "@/lib/membersServer";
import { z } from "zod";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().max(500).optional(),
  accessCode: z.string().max(100).optional(),
}).refine(data => data.password || data.accessCode, {
  message: "Password or access code is required",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validated = loginSchema.parse(body);
    const { username, password, accessCode } = validated;

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

    let role: Role | undefined;
    let sub: string | undefined;

    if (password) {
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

      role = "admin";
      sub = username;
    } else if (accessCode) {
      // Member login - verify against member data from Google Sheet
      const member = await verifyMemberAccessCode(username, accessCode);
      if (!member) {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        return NextResponse.json(
          { success: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      role = "member";
      sub = member.memberId;
    } else {
      // This should never be reached due to Zod validation
      return NextResponse.json(
        { success: false, error: "Password or access code is required" },
        { status: 400 }
      );
    }

    if (!role || !sub) {
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create session
    let memberId: string | undefined;
    let memberName: string | undefined;
    
    if (role === "member") {
      // Re-fetch member to get name
      const member = await verifyMemberAccessCode(username, accessCode!);
      if (member) {
        memberId = member.memberId;
        memberName = member.name;
      }
    }
    
    const token = await createSession(role, sub, memberId, memberName);
    await setSession(token);

    return NextResponse.json({
      success: true,
      role,
      sub,
      ...(memberId && { memberId }),
      ...(memberName && { name: memberName }),
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
