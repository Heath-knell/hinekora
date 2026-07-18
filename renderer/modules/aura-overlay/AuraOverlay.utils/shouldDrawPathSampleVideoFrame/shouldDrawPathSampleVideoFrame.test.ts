import { describe, expect, it } from "vitest";

import { auraOverlayFrameIntervalMs } from "../../AuraOverlay.constants";
import { shouldDrawPathSampleVideoFrame } from "./shouldDrawPathSampleVideoFrame";

describe("shouldDrawPathSampleVideoFrame", () => {
  it("draws the first frame and gates later frames to the 30fps budget", () => {
    expect(shouldDrawPathSampleVideoFrame(1_000, null)).toBe(true);
    expect(shouldDrawPathSampleVideoFrame(1_033, 1_000)).toBe(false);
    expect(
      shouldDrawPathSampleVideoFrame(1_000 + auraOverlayFrameIntervalMs, 1_000),
    ).toBe(true);
    expect(shouldDrawPathSampleVideoFrame(1_034, 1_000)).toBe(true);
  });
});
