import { describe, expect, it } from "vitest";

import { createTangentAtPathLength } from "./createTangentAtPathLength";

describe("createTangentAtPathLength", () => {
  it("returns a normalized tangent at the requested path length", () => {
    const tangent = createTangentAtPathLength(
      [
        { length: 0, x: 0, y: 0 },
        { length: 5, x: 3, y: 4 },
      ],
      2,
      { x: 1, y: 0 },
    );

    expect(tangent.x).toBeCloseTo(0.6);
    expect(tangent.y).toBeCloseTo(0.8);
  });
});
