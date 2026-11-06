import { describe, expect, it } from "vitest";
import { computeExpaAttractionStats } from "@/lib/server/expaAttractionStats";

describe("computeExpaAttractionStats", () => {
  it("uses EXPA lead data and keeps the newest record first", () => {
    const stats = computeExpaAttractionStats(
      [
        {
          id: "1",
          fullName: "Alice A",
          email: "alice@example.com",
          createdAt: "2026-09-15T12:00:00Z",
          lcName: "Lyon",
          bestStatus: "open",
          programme: "GTa",
        },
        {
          id: "2",
          fullName: "Bob B",
          email: "bob@example.com",
          createdAt: "2026-09-18T09:00:00Z",
          lcName: "Paris",
          bestStatus: "approved",
          programme: "GV",
        },
        {
          id: "3",
          fullName: "Cara C",
          email: "cara@example.com",
          createdAt: "2026-09-20T08:00:00Z",
          lcName: "Lyon",
          bestStatus: "realized",
          programme: "GTe",
        },
      ],
      new Date("2026-09-20T12:00:00Z")
    );

    expect(stats.totalLeads).toBe(3);
    expect(stats.recent[0]?.fullName).toBe("Cara C");
    expect(stats.byProgramme).toEqual([
      { programme: "GTa", total: 1 },
      { programme: "GV",  total: 1 },
      { programme: "GTe", total: 1 },
    ]);
  });

  it("ignores leads before the Feb 2026 campaign and groups missing programmes under Other", () => {
    const stats = computeExpaAttractionStats(
      [
        {
          id: "1",
          fullName: "Old Lead",
          email: "old@example.com",
          createdAt: "2025-12-10T12:00:00Z",
          lcName: "BARDO",
          bestStatus: "open",
          programme: "GV",
        },
        {
          id: "2",
          fullName: "New Lead",
          email: "new@example.com",
          createdAt: "2026-03-01T12:00:00Z",
          lcName: "BARDO",
          bestStatus: "approved",
          programme: "",
        },
      ],
      new Date("2026-09-20T12:00:00Z")
    );

    expect(stats.totalLeads).toBe(2);
    expect(stats.byProgramme).toEqual([{ programme: "Other", total: 1 }]);
    expect(stats.recent.map((r) => r.programme)).toEqual(["—", "GV"]);
  });
});
