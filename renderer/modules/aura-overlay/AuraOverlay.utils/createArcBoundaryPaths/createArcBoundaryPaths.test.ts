import { describe, expect, it } from "vitest";

import { createArcBoundaryPaths } from "./createArcBoundaryPaths";

describe("createArcBoundaryPaths", () => {
  it("creates svg path strings for arc boundaries", () => {
    expect(
      createArcBoundaryPaths(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        4,
      ),
    ).toEqual({
      inner: "M 0 -2 L 10 -2",
      outer: "M 0 2 L 10 2",
    });
  });
});
