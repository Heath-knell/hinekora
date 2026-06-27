import { describe, expect, it } from "vitest";

import { resolvePathSampleSegmentCount } from "./resolvePathSampleSegmentCount";

describe("resolvePathSampleSegmentCount", () => {
  it("uses the larger output or source segment requirement within bounds", () => {
    expect(
      resolvePathSampleSegmentCount({
        maxSegmentCount: 20,
        minSegmentCount: 2,
        outputLength: 100,
        targetOutputSegmentLength: 25,
        targetSourceSegmentLength: 10,
        totalLength: 90,
      }),
    ).toBe(9);
  });

  it("clamps segment counts", () => {
    expect(
      resolvePathSampleSegmentCount({
        maxSegmentCount: 4,
        minSegmentCount: 2,
        outputLength: 1_000,
        targetOutputSegmentLength: 10,
        totalLength: 1_000,
      }),
    ).toBe(4);
  });
});
