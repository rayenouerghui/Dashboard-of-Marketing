import { NextRequest, NextResponse } from "next/server";
import { loadResourcesFromSheet, saveResourceToSheet, deleteResourceFromSheet } from "@/lib/resourcesServer";
import type { Resource } from "@/lib/resourcesServer";

export async function GET() {
  try {
    const resources = await loadResourcesFromSheet();
    return NextResponse.json(resources);
  } catch (error) {
    console.error("[API/resources] GET error:", error);
    return NextResponse.json({ error: "Failed to load resources" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, type, url, content } = body;

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    const newResource: Resource = {
      id: crypto.randomUUID(),
      title,
      description: description || "",
      type,
      url: url || undefined,
      content: content || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveResourceToSheet(newResource);
    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    console.error("[API/resources] POST error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
    }

    await deleteResourceFromSheet(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API/resources] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
