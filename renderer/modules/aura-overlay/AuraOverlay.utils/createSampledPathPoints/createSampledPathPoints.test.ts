import { describe, expect, it } from "vitest";

import { createSampledPathPoints } from "./createSampledPathPoints";

describe("createSampledPathPoints", () => {
  it("accumulates path length across points", () => {
    expect(
      createSampledPathPoints([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 6, y: 8 },
      ]),
    ).toEqual([
      { length: 0, x: 0, y: 0 },
      { length: 5, x: 3, y: 4 },
      { length: 10, x: 6, y: 8 },
    ]);
  });
});
