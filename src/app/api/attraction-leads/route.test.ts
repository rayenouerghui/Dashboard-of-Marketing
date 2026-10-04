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
    expect(stats.byUniversity["Lyon"]?.total).toBe(2);
    expect(stats.byUniversity["Paris"]?.total).toBe(1);
  });

  it("rejects generic source labels and empty university names", () => {
    const stats = computeExpaAttractionStats(
      [
        {
          id: "1",
          fullName: "Source User",
          email: "source@example.com",
          createdAt: "2026-09-19T12:00:00Z",
          lcName: "Information",
          bestStatus: "open",
          programme: "GTa",
        },
        {
          id: "2",
          fullName: "Real User",
          email: "real@example.com",
          createdAt: "2026-09-19T15:00:00Z",
          lcName: "Tunis",
          bestStatus: "approved",
          programme: "GV",
        },
        {
          id: "3",
          fullName: "No University",
          email: "no-university@example.com",
          createdAt: "2026-09-19T18:00:00Z",
          lcName: "",
          bestStatus: "open",
          programme: "GTe",
        },
      ],
      new Date("2026-09-20T12:00:00Z")
    );

    expect(Object.keys(stats.byUniversity)).not.toContain("Information");
    expect(Object.keys(stats.byUniversity)).not.toContain("");
    expect(stats.byUniversity["Tunis"]?.total).toBe(1);
  });
});
