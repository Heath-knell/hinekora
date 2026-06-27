import { describe, expect, it } from "vitest";

import { shouldDrawPathSampleVideoFrame } from "./shouldDrawPathSampleVideoFrame";

describe("shouldDrawPathSampleVideoFrame", () => {
  it("draws the first frame and gates later frames to the 24fps budget", () => {
    expect(shouldDrawPathSampleVideoFrame(1_000, null)).toBe(true);
    expect(shouldDrawPathSampleVideoFrame(1_010, 1_000)).toBe(false);
    expect(shouldDrawPathSampleVideoFrame(1_050, 1_000)).toBe(true);
  });
});
