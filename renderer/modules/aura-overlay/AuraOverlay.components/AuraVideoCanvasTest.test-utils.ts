import { vi } from "vitest";

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

export { createCanvasContextMock, mockCreatedCanvasContext };
