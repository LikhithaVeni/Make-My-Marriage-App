import { describe, expect, it } from "vitest";

import { progressPercent } from "@/components/ui/ProgressBar";

describe("progressPercent", () => {
  it("rounds to a whole percent", () => {
    expect(progressPercent(31, 82)).toBe(38);
    expect(progressPercent(640, 1180)).toBe(54);
  });

  it("stays within 0 to 100", () => {
    expect(progressPercent(120, 100)).toBe(100);
    expect(progressPercent(-5, 100)).toBe(0);
  });

  it("is 0 when there is nothing to measure against", () => {
    expect(progressPercent(0, 0)).toBe(0);
  });
});
