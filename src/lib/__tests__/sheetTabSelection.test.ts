import { describe, expect, it } from "vitest";
import { pickBestRankingSheetTab } from "@/lib/googleSheetsServer";

describe("pickBestRankingSheetTab", () => {
  it("respects the explicit RANKING_SHEET_TAB override", () => {
    process.env.RANKING_SHEET_TAB = "New Form";

    try {
      const tabs = [
        {
          name: "Old Form",
          rows: [
            ["Submitted at", "Member Name", "Would you be interested in attending a Business & AI event?"],
            ["2026-02-01", "Information booth on campus", "No"],
          ],
        },
        {
          name: "New Form",
          rows: [
            ["Submitted at", "Member Name", "Would you be interested in attending a Business & AI event?"],
            ["2026-09-15", "Alice Martin", "Yes"],
          ],
        },
      ];

      expect(pickBestRankingSheetTab(tabs)).toBe("New Form");
    } finally {
      delete process.env.RANKING_SHEET_TAB;
    }
  });

  it("auto-selects the tab with the newest valid member-name data", () => {
    delete process.env.RANKING_SHEET_TAB;

    const tabs = [
      {
        name: "Legacy Form",
        rows: [
          ["Submitted at", "Member Name"],
          ["2026-02-05", "Information booth on campus"],
        ],
      },
      {
        name: "New Form",
        rows: [
          ["Submitted at", "Member Name", "Would you be interested in attending a Business & AI event?"],
          ["2026-09-20", "Sara Ben Ali", "Yes"],
          ["2026-09-21", "Hamza Khelifi", "Yes"],
        ],
      },
    ];

    expect(pickBestRankingSheetTab(tabs)).toBe("New Form");
  });
});
