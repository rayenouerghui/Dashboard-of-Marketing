import { describe, expect, it } from "vitest";
import { buildSupabaseAttractionPayload } from "@/app/api/scheduled-attractions/route";
import { assignLeadsToAttractions, mergeTodayAttractions, normalizeLeaderboardMemberName } from "@/app/member-dashboard/MemberDashboardClient";

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

  it("normalizes ranking names and drops source labels from the daily leaderboard", () => {
    expect(normalizeLeaderboardMemberName("  yosr gouja  ")).toBe("Yosr Gouja");
    expect(normalizeLeaderboardMemberName("classroom")).toBe("");
    expect(normalizeLeaderboardMemberName("information")).toBe("");
  });
});

describe("same-day attraction lead attribution", () => {
  const esprit = {
    id: "esprit",
    title: "ESPRIT",
    start: "2026-11-07",
    extendedProps: { university: "ESPRIT: École Supérieure Privée d'Ingénierie et de Technologies", goal: 20 },
  };
  const isg = {
    id: "isg",
    title: "ISG",
    start: "2026-11-07",
    extendedProps: { university: "ISG: Institut Supérieur de Gestion", goal: 20 },
  };

  const lead = (university: string) => ({ university }) as any;

  it("splits today's leads across same-day attractions by the lead's university", () => {
    const buckets = assignLeadsToAttractions(
      [esprit, isg] as any,
      [
        lead("ESPRIT: École Supérieure Privée d'Ingénierie et de Technologies"),
        lead("esprit"),
        lead("ISG: Institut Supérieur de Gestion"),
        lead("ISG"),
      ] as any,
    );

    expect(buckets.map((bucket) => bucket.length)).toEqual([2, 2]);
  });

  it("never attributes a lead to an attraction from another university", () => {
    const buckets = assignLeadsToAttractions(
      [esprit, isg] as any,
      [lead("ISG: Institut Supérieur de Gestion"), lead("ISG")] as any,
    );

    expect(buckets[0]).toHaveLength(0);
    expect(buckets[1]).toHaveLength(2);
  });

  it("ignores blank or unmatched universities instead of dumping them into the first attraction", () => {
    const buckets = assignLeadsToAttractions(
      [esprit, isg] as any,
      [lead(""), lead("FMT: Faculté de Médecine de Tunis")] as any,
    );

    expect(buckets.map((bucket) => bucket.length)).toEqual([0, 0]);
  });

  it("maps known university-name variants through the alias table", () => {
    const espritPlain = {
      id: "esprit-plain",
      title: "ESPRIT El Ghazela",
      start: "2026-11-07",
      extendedProps: { university: "ESPRIT El Ghazela", goal: 10 },
    };
    const iset = {
      id: "iset",
      title: "ISET Charguia",
      start: "2026-11-07",
      extendedProps: { university: "ISET Charguia", goal: 10 },
    };

    const buckets = assignLeadsToAttractions(
      [espritPlain, iset] as any,
      [
        lead("ESPRIT: École Supérieure Privée d'Ingénierie et de Technologies"),
        lead("ISET Chargia"),
      ] as any,
    );

    expect(buckets.map((bucket) => bucket.length)).toEqual([1, 1]);
  });

  it("does not let a shorter university code bleed into a longer one (ENS vs ENSIT)", () => {
    const ensit = {
      id: "ensit",
      title: "ENSIT",
      start: "2026-11-07",
      extendedProps: { university: "ENSIT", goal: 10 },
    };

    const buckets = assignLeadsToAttractions([ensit] as any, [lead("ENS")] as any);

    expect(buckets[0]).toHaveLength(0);
  });
});
