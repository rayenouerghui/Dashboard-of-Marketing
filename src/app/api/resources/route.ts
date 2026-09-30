import { NextRequest, NextResponse } from "next/server";
import { loadResourcesFromSheet, saveResourceToSheet, deleteResourceFromSheet } from "@/lib/resourcesServer";
import type { Resource } from "@/lib/resourcesServer";
import { z } from "zod";
import { sanitizeObject } from "@/lib/sanitize";
import { requireRole } from "@/lib/auth";

const resourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["pdf", "link", "image", "text"]),
  url: z.string().url().optional().or(z.literal("")),
  content: z.string().max(5000).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export async function GET() {
  try {
    const resources = await loadResourcesFromSheet();
    return NextResponse.json(resources, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error("[API/resources] GET error:", error);
    return NextResponse.json({ error: "Failed to load resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin'); // Admin only
    const body = await request.json();
    
    // Validate with Zod
    const validated = resourceSchema.parse(body);
    
    // Sanitize user-provided strings
    const sanitized = sanitizeObject(validated, {
      title: 200,
      description: 1000,
      type: 50,
      content: 5000,
    });

    const newResource: Resource = {
      id: crypto.randomUUID(),
      title: sanitized.title,
      description: sanitized.description || "",
      type: sanitized.type,
      url: sanitized.url || undefined,
      content: sanitized.content || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveResourceToSheet(newResource);
    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error("[API/resources] POST error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole('admin'); // Admin only
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate with Zod
    deleteSchema.parse({ id });

    await deleteResourceFromSheet(id!);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error("[API/resources] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
