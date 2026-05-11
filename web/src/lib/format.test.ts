import { describe, expect, it } from "vitest";
import { formatCadence, getDueStatus, getRecordOriginLabel } from "@/lib/format";

describe("preventive record formatting", () => {
  it("labels current-clinic preventive records as recorded here", () => {
    expect(getRecordOriginLabel(true, "Recorded elsewhere")).toBe("Recorded here");
  });

  it("keeps privacy-safe labels for other-clinic preventive records", () => {
    expect(getRecordOriginLabel(false, "Completed elsewhere")).toBe("Completed elsewhere");
  });

  it("marks past due records as overdue", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(getDueStatus(yesterday.toISOString()).tone).toBe("danger");
  });

  it("treats missing due dates as neutral", () => {
    expect(getDueStatus(null)).toEqual({
      label: "No due date",
      tone: "neutral",
    });
  });

  it("formats structured cadence labels", () => {
    expect(formatCadence(3, "MONTH")).toBe("Every 3 months");
  });
});
