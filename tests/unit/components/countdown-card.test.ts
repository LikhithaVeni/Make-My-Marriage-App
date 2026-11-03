import { describe, expect, it } from "vitest";

import { countdownLabel } from "@/components/dashboard/CountdownCard";

describe("countdownLabel", () => {
  it("counts down to the wedding", () => {
    expect(countdownLabel(451)).toBe("451 days to go");
    expect(countdownLabel(1)).toBe("1 day to go");
  });

  it("groups large numbers the Indian way", () => {
    expect(countdownLabel(1500)).toBe("1,500 days to go");
  });

  it("handles the day itself and after", () => {
    expect(countdownLabel(0)).toBe("The wedding is today");
    expect(countdownLabel(-1)).toBe("Married 1 day ago");
    expect(countdownLabel(-3)).toBe("Married 3 days ago");
  });
});
