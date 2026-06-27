import { describe, expect, it } from "vitest";

import { createAuraCropClipPath } from "./createAuraCropClipPath";

describe("createAuraCropClipPath", () => {
  it("creates a polygon clip path for arched aura crops", () => {
    const clipPath = createAuraCropClipPath({
      id: "crop-arc",
      label: "Arched aura",
      shape: "arc",
      x: 90,
      y: 90,
      width: 140,
      height: 80,
      arc: {
        startX: 10,
        startY: 70,
        endX: 130,
        endY: 70,
        controlX: 70,
        controlY: 10,
        thickness: 20,
      },
    });

    expect(clipPath).toMatch(/^polygon\(/);
    expect(clipPath).toContain("%");
  });

  it("ignores rectangular aura crops", () => {
    expect(
      createAuraCropClipPath({
        id: "crop-1",
        label: "Life",
        x: 10,
        y: 20,
        width: 100,
        height: 40,
      }),
    ).toBeUndefined();
  });
});
