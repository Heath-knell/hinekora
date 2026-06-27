import { describe, expect, it } from "vitest";

import type { PathSampleVideoSegment } from "../AuraOverlay.utils.types";
import { createPathSampleVideoSourceBounds } from "./createPathSampleVideoSourceBounds";

describe("createPathSampleVideoSourceBounds", () => {
  it("unions segment source rectangles", () => {
    expect(
      createPathSampleVideoSourceBounds([
        createSegment({
          sourceHeight: 20,
          sourceWidth: 30,
          sourceX: 10,
          sourceY: 20,
        }),
        createSegment({
          sourceHeight: 60,
          sourceWidth: 40,
          sourceX: 35,
          sourceY: 5,
        }),
      ]),
    ).toEqual({
      height: 60,
      width: 65,
      x: 10,
      y: 5,
    });
  });
});

function createSegment(input: {
  sourceHeight: number;
  sourceWidth: number;
  sourceX: number;
  sourceY: number;
}): PathSampleVideoSegment {
  return {
    clipHeight: 1,
    clipWidth: 1,
    clipX: 0,
    clipY: 0,
    sourceHeight: input.sourceHeight,
    sourceWidth: input.sourceWidth,
    sourceX: input.sourceX,
    sourceY: input.sourceY,
    transformA: 1,
    transformB: 0,
    transformC: 0,
    transformD: 1,
    transformE: 0,
    transformF: 0,
  };
}
