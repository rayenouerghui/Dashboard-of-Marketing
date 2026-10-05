import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { 
  saveScheduledAttractionToSheet,
  loadScheduledAttractionsFromSheet,
  deleteScheduledAttractionFromSheet,
  sanitizeScheduledAttractionInput,
} from "@/lib/googleSheetsServer";
import { requireRole } from "@/lib/auth";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

export function normalizeSupabaseAttraction(row: any) {
  const start = String(row?.date ?? row?.start ?? "").trim();
  const notes = row?.description ?? row?.notes ?? row?.note ?? "";
  const goal = Number(row?.goal ?? row?.extendedProps?.goal ?? 0);

  return {
    id: String(row?.id ?? `custom-${Date.now()}`),
    title: String(row?.title ?? ""),
    start,
    end: row?.end ?? row?.end_time ?? undefined,
    university: String(row?.university ?? ""),
    notes: String(notes ?? ""),
    note: String(notes ?? ""),
    goal,
    status: row?.status ?? "published",
    createdAt: row?.created_at ?? row?.createdAt ?? new Date().toISOString(),
    updatedAt: row?.updated_at ?? row?.updatedAt ?? new Date().toISOString(),
    backgroundColor: row?.background_color ?? row?.backgroundColor ?? "#465FFF",
    borderColor: row?.border_color ?? row?.borderColor ?? "#465FFF",
    extendedProps: {
      university: String(row?.university ?? ""),
      note: String(notes ?? ""),
      goal,
    },
  };
}

export function buildSupabaseAttractionPayload(attraction: any) {
  const dateValue = String(attraction.start ?? "").split("T")[0] || "";
  const goal = Number(attraction.extendedProps?.goal ?? attraction.goal ?? 0);

  return {
    id: attraction.id,
    title: attraction.title,
    university: attraction.university,
    date: dateValue,
    description: attraction.notes ?? attraction.note ?? "",
    goal,
    status: attraction.status ?? "published",
    is_visible: true,
    updated_at: new Date().toISOString(),
  };
}

async function listSupabaseAttractions() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("scheduled_attractions")
    .select("*")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeSupabaseAttraction);
}

async function upsertSupabaseAttraction(attraction: any) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const payload = buildSupabaseAttractionPayload(attraction);

  const { error } = await supabase.from("scheduled_attractions").upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

async function deleteSupabaseAttraction(id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase.from("scheduled_attractions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

const attractionSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object") return input;

  const record = input as Record<string, any>;
  const nested = record.extendedProps && typeof record.extendedProps === "object" ? (record.extendedProps as Record<string, any>) : {};
  const withFlats = {
    ...record,
    id: record.id ?? nested.id ?? `custom-${Date.now()}`,
    title: record.title ?? nested.title ?? record.name ?? "",
    start: record.start ?? record.date ?? nested.start ?? "",
    university: record.university ?? nested.university ?? "",
    notes: record.notes ?? record.note ?? nested.note ?? "",
    goal: record.goal ?? nested.goal ?? 0,
    end: record.end ?? nested.end,
  };
  return withFlats;
}, z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  start: z.string().min(1),
  university: z.string().min(1),
  end: z.string().optional(),
  goal: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  note: z.string().optional(),
}));

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      const attractions = await loadScheduledAttractionsFromSheet();
      return NextResponse.json(attractions, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      });
    }

    try {
      const supabaseAttractions = await listSupabaseAttractions();
      return NextResponse.json(supabaseAttractions, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      });
    } catch (error) {
      console.warn("Supabase scheduled attractions read failed; falling back to legacy path:", error);
      const attractions = await loadScheduledAttractionsFromSheet();
      return NextResponse.json(attractions, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      });
    }
  } catch (error) {
    console.error("Failed to load scheduled attractions:", error);
    return NextResponse.json({ error: "Failed to load scheduled attractions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const validated = attractionSchema.parse(body);
    const sanitized = sanitizeScheduledAttractionInput(validated);

    if (!sanitized) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      try {
        const supabaseSaved = await upsertSupabaseAttraction(sanitized);
        if (supabaseSaved) {
          revalidateTag("scheduled-attractions", "api/scheduled-attractions");
          return NextResponse.json({ success: true, attraction: sanitized }, {
            status: 200,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
          });
        }
      } catch (error) {
        console.warn("Supabase scheduled attraction save failed; falling back to legacy path:", error);
      }
    }

    await saveScheduledAttractionToSheet(sanitized);
    revalidateTag("scheduled-attractions", "api/scheduled-attractions");

    return NextResponse.json({ success: true, attraction: sanitized }, {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("Failed to save scheduled attraction:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to save scheduled attraction",
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing attraction id" }, { status: 400 });
    }

    if (hasSupabaseConfig()) {
      try {
        const supabaseDeleted = await deleteSupabaseAttraction(id);
        if (supabaseDeleted) {
          revalidateTag("scheduled-attractions", "api/scheduled-attractions");
          return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
        }
      } catch (error) {
        console.warn("Supabase scheduled attraction delete failed; falling back to legacy path:", error);
      }
    }

    await deleteScheduledAttractionFromSheet(id);
    revalidateTag("scheduled-attractions", "api/scheduled-attractions");
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Failed to delete scheduled attraction:", error);
    return NextResponse.json({ error: "Failed to delete scheduled attraction" }, { status: 500 });
  }
}
