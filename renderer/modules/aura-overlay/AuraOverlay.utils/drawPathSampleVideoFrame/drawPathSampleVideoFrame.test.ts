import { describe, expect, it, vi } from "vitest";

import type { DrawPathSampleVideoFrameInput } from "../AuraOverlay.utils.types";
import { drawPathSampleVideoFrame } from "./drawPathSampleVideoFrame";

describe("drawPathSampleVideoFrame", () => {
  it("draws path segments through a bounded source canvas", () => {
    const canvas = document.createElement("canvas");
    const video = document.createElement("video");
    const context = createCanvasContextMock();
    const sourceContext = createCanvasContextMock();
    vi.spyOn(canvas, "getContext").mockReturnValue(context);
    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    const createElement = mockCreatedCanvasContext(sourceContext);
    drawPathSampleVideoFrame({
      canvas,
      geometry: createGeometry({
        sourceBounds: { height: 20, width: 20, x: 10, y: 10 },
      }),
      video,
    });
    createElement.mockRestore();

    expect(sourceContext.drawImage).toHaveBeenCalledOnce();
    expect(vi.mocked(context.drawImage).mock.calls[0]?.[0]).not.toBe(video);
  });

  it("falls back to the source video when the bounded source canvas would be too large", () => {
    const canvas = document.createElement("canvas");
    const video = document.createElement("video");
    const context = createCanvasContextMock();
    const sourceContext = createCanvasContextMock();
    vi.spyOn(canvas, "getContext").mockReturnValue(context);
    Object.defineProperty(video, "readyState", {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    const createElement = mockCreatedCanvasContext(sourceContext);
    drawPathSampleVideoFrame({
      canvas,
      geometry: createGeometry({
        sourceBounds: { height: 4_096, width: 4_096, x: 0, y: 0 },
      }),
      video,
    });
    createElement.mockRestore();

    expect(sourceContext.drawImage).not.toHaveBeenCalled();
    expect(vi.mocked(context.drawImage).mock.calls[0]?.[0]).toBe(video);
  });
});

function createGeometry(
  input: Pick<DrawPathSampleVideoFrameInput["geometry"], "sourceBounds">,
): DrawPathSampleVideoFrameInput["geometry"] {
  return {
    height: 20,
    segments: [
      {
        clipHeight: 10,
        clipWidth: 10,
        clipX: 0,
        clipY: 0,
        sourceHeight: 10,
        sourceWidth: 10,
        sourceX: 10,
        sourceY: 10,
        transformA: 1,
        transformB: 0,
        transformC: 0,
        transformD: 1,
        transformE: 0,
        transformF: 0,
      },
    ],
    sourceBounds: input.sourceBounds,
    width: 20,
  };
}

function createCanvasContextMock(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    rect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
  } as unknown as CanvasRenderingContext2D;
}

function mockCreatedCanvasContext(
  context: CanvasRenderingContext2D,
): ReturnType<typeof vi.spyOn> {
  const createElement = document.createElement.bind(document);

  return vi.spyOn(document, "createElement").mockImplementation(((
    tagName: string,
    options?: ElementCreationOptions,
  ) => {
    const element = createElement(tagName, options);
    if (tagName.toLowerCase() === "canvas") {
      vi.spyOn(element as HTMLCanvasElement, "getContext").mockReturnValue(
        context,
      );
    }

    return element;
  }) as typeof document.createElement);
}
