import { describe, expect, it } from "vitest";

import { createArcBoundaryPoints } from "./createArcBoundaryPoints";

describe("createArcBoundaryPoints", () => {
  it("creates inner and outer boundary points around a path", () => {
    expect(
      createArcBoundaryPoints(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        4,
      ),
    ).toEqual({
      inner: [
        { x: 0, y: -2 },
        { x: 10, y: -2 },
      ],
      outer: [
        { x: 0, y: 2 },
        { x: 10, y: 2 },
      ],
    });
  });
});
