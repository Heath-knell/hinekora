import type { DragEndEvent } from "@dnd-kit/react";
import { describe, expect, it } from "vitest";

import { resolveDropTimelineSeconds } from "./EditorDragDropProvider.utils";

function createDropEvent(input: {
  clientX?: number;
  left?: number;
  width?: number;
}): DragEndEvent {
  return {
    canceled: false,
    nativeEvent:
      input.clientX === undefined
        ? undefined
        : ({ clientX: input.clientX } as Event & { clientX: number }),
    operation: {
      target:
        input.left === undefined || input.width === undefined
          ? null
          : {
              shape: {
                boundingRectangle: {
                  left: input.left,
                  width: input.width,
                },
              },
            },
    },
    suspend: () => ({ resume: () => undefined }),
  } as unknown as DragEndEvent;
}

describe("EditorDragDropProvider utils", () => {
  it("resolves dropped client positions into timeline seconds", () => {
    expect(
      resolveDropTimelineSeconds({
        event: createDropEvent({ clientX: 50, left: 0, width: 100 }),
        railPaddingPixels: 10,
        timelineDurationSeconds: 10,
        visibleDurationSeconds: 12.5,
      }),
    ).toBe(6.25);
    expect(
      resolveDropTimelineSeconds({
        event: createDropEvent({ clientX: 100, left: 0, width: 200 }),
        railPaddingPixels: 10,
        timelineDurationSeconds: 24,
        visibleDurationSeconds: 30,
      }),
    ).toBe(15);
    expect(
      resolveDropTimelineSeconds({
        event: createDropEvent({ clientX: 100, left: 0, width: 200 }),
        railPaddingPixels: 10,
        timelineDurationSeconds: 24,
        visibleDurationSeconds: 24,
      }),
    ).toBe(12);
  });

  it("resolves drops against the padded timeline rail", () => {
    const baseInput = {
      railPaddingPixels: 10,
      timelineDurationSeconds: 10,
      visibleDurationSeconds: 12.5,
    };

    expect(
      resolveDropTimelineSeconds({
        ...baseInput,
        event: createDropEvent({ clientX: 10, left: 0, width: 100 }),
      }),
    ).toBe(0);
    expect(
      resolveDropTimelineSeconds({
        ...baseInput,
        event: createDropEvent({ clientX: 90, left: 0, width: 100 }),
      }),
    ).toBe(12.5);
  });

  it("falls back to the timeline end when bounds are missing", () => {
    expect(
      resolveDropTimelineSeconds({
        event: createDropEvent({}),
        railPaddingPixels: 10,
        timelineDurationSeconds: 12,
        visibleDurationSeconds: 15,
      }),
    ).toBe(12);
  });
});
