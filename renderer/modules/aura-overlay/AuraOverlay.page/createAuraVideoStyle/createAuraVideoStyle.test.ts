import { describe, expect, it } from "vitest";

import { createAuraVideoStyle } from "./createAuraVideoStyle";

describe("createAuraVideoStyle", () => {
  it("positions the captured video behind the cropped aura window", () => {
    expect(
      createAuraVideoStyle(
        {
          id: "crop-1",
          label: "Life",
          x: 100,
          y: 50,
          width: 200,
          height: 80,
        },
        {
          id: "placement-1",
          cropRegionId: "crop-1",
          x: 24,
          y: 24,
          scale: 2,
          opacity: 1,
        },
        { width: 1920, height: 1080 },
      ),
    ).toMatchObject({
      left: "-200px",
      top: "-100px",
      width: "3840px",
      height: "2160px",
    });
  });
});
