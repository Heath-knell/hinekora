import { describe, expect, it } from "vitest";

import {
  createDisplayDimensionsLookup,
  getNativeDisplayDimensions,
  validateBoundsOnDisplays,
} from "./display-geometry";

describe("display geometry", () => {
  it("uses native pixel dimensions for scaled displays", () => {
    expect(
      getNativeDisplayDimensions({
        id: 1,
        size: { width: 1280, height: 720 },
        scaleFactor: 1.5,
      }),
    ).toEqual({ width: 1920, height: 1080 });
  });

  it("indexes native dimensions by display id", () => {
    expect(
      createDisplayDimensionsLookup([
        {
          id: 2,
          size: { width: 2560, height: 1440 },
          scaleFactor: 1,
        },
      ]).get("2"),
    ).toEqual({ width: 2560, height: 1440 });
  });

  it("validates bounds when enough of the rectangle overlaps a display work area", () => {
    const bounds = { x: 1800, y: 900, width: 200, height: 200 };
    const displays = [
      {
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      },
    ];

    expect(validateBoundsOnDisplays(bounds, displays, 100)).toBe(bounds);
    expect(validateBoundsOnDisplays(bounds, displays, 150)).toBeNull();
  });

  it("rejects missing or off-screen bounds", () => {
    const displays = [
      {
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      },
    ];

    expect(validateBoundsOnDisplays(null, displays, 100)).toBeNull();
    expect(
      validateBoundsOnDisplays(
        { x: 3000, y: 3000, width: 200, height: 200 },
        displays,
        100,
      ),
    ).toBeNull();
  });
});
