import { describe, expect, it } from "vitest";
import { buildSupabaseAttractionPayload } from "@/app/api/scheduled-attractions/route";
import { mergeTodayAttractions } from "@/app/member-dashboard/MemberDashboardClient";

describe("Supabase attraction payload", () => {
  it("keeps the configured goal value when saving", () => {
    const payload = buildSupabaseAttractionPayload({
      id: "custom-123",
      title: "Test attraction",
      university: "AIESEC Tunisia",
      start: "2026-10-10",
      notes: "Important session",
      extendedProps: {
        university: "AIESEC Tunisia",
        goal: 18,
      },
    });

    expect(payload.goal).toBe(18);
    expect(payload.date).toBe("2026-10-10");
  });

  it("falls back to zero when goal is missing", () => {
    const payload = buildSupabaseAttractionPayload({
      id: "custom-456",
      title: "Test attraction",
      university: "AIESEC Tunisia",
      start: "2026-10-11",
      notes: "No goal set",
    });

    expect(payload.goal).toBe(0);
  });

  it("keeps the previous valid attraction list when a refresh briefly returns empty", () => {
    const previous = [
      {
        id: "a1",
        title: "Today",
        start: "2026-10-05",
        backgroundColor: "#465FFF",
        borderColor: "#465FFF",
        extendedProps: { university: "AIESEC Tunisia", goal: 12 },
      },
    ] as any[];

    expect(mergeTodayAttractions(previous, [])).toEqual(previous);
  });
});
