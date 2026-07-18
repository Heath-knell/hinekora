import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const thumbnailMocks = vi.hoisted(() => ({
  createClipThumbnails: vi.fn(),
  createThumbnailCacheKey: vi.fn(() => "recording-thumbnails"),
}));

vi.mock("./useMediaClipThumbnails.utils", () => thumbnailMocks);

import { useMediaClipThumbnails } from "./useMediaClipThumbnails";

let container: HTMLDivElement;
let enabled = true;
let root: Root;

function Probe() {
  useMediaClipThumbnails({
    durationSeconds: 300,
    enabled,
    inSeconds: 0,
    mediaUrl: "hinekora-media://run-recording/recording-1",
    outSeconds: 300,
    widthPixels: 640,
  });

  return null;
}

async function renderProbe() {
  await act(async () => {
    root.render(<Probe />);
  });
}

describe("useMediaClipThumbnails", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.append(container);
    enabled = true;
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("cancels in-flight thumbnail extraction while playback is active", async () => {
    let resolveThumbnails!: (thumbnails: string[]) => void;
    thumbnailMocks.createClipThumbnails.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        resolveThumbnails = resolve;
      }),
    );
    thumbnailMocks.createClipThumbnails.mockResolvedValue([]);
    await renderProbe();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(thumbnailMocks.createClipThumbnails).toHaveBeenCalledOnce();
    const abortSignal = thumbnailMocks.createClipThumbnails.mock.calls[0]?.[1];
    expect(abortSignal?.aborted).toBe(false);

    enabled = false;
    await renderProbe();

    expect(abortSignal?.aborted).toBe(true);
    enabled = true;
    await renderProbe();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(thumbnailMocks.createClipThumbnails).toHaveBeenCalledOnce();

    resolveThumbnails([]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(thumbnailMocks.createClipThumbnails).toHaveBeenCalledTimes(2);
  });
});
