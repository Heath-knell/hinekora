import { describe, expect, it } from "vitest";

import { createPathSourceRect } from "./createPathSourceRect";

describe("createPathSourceRect", () => {
  it("bounds source corners to the video dimensions", () => {
    expect(
      createPathSourceRect({
        halfNormalLength: 10,
        halfTangentLength: 20,
        normal: { x: 0, y: 1 },
        point: { x: 5, y: 5 },
        tangent: { x: 1, y: 0 },
        videoSize: { height: 100, width: 100 },
      }),
    ).toEqual({
      height: 15,
      width: 25,
      x: 0,
      y: 0,
    });
  });
});
