import { describe, expect, it } from "vitest";

import { interpolateSampledPathPoint } from "./interpolateSampledPathPoint";

describe("interpolateSampledPathPoint", () => {
  it("interpolates between sampled path points by length", () => {
    expect(
      interpolateSampledPathPoint(
        [
          { length: 0, x: 0, y: 0 },
          { length: 10, x: 20, y: 40 },
        ],
        2.5,
      ),
    ).toEqual({ length: 2.5, x: 5, y: 10 });
  });
});
