import { describe, expect, it } from "vitest";

import { createAuraViewportProjection } from "./createAuraViewportProjection";

describe("createAuraViewportProjection", () => {
  it("projects legacy 16:9 coordinates into a centered ultrawide safe area", () => {
    expect(
      createAuraViewportProjection(
        { width: 1920, height: 1080 },
        { width: 3440, height: 1440 },
      ),
    ).toEqual({
      offsetX: 440,
      offsetY: 0,
      scale: 4 / 3,
    });
  });
});
