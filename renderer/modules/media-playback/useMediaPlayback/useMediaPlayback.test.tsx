import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clampMediaPlaybackSeconds,
  useMediaPlayback,
} from "./useMediaPlayback";

let container: HTMLDivElement;
let root: Root;
let hookResult: ReturnType<typeof useMediaPlayback> | null = null;
let mediaUrl: string | null = "hinekora-media://recording/one";
let onVisualTimeChange = vi.fn();

function Probe() {
  hookResult = useMediaPlayback({
    fallbackDurationSeconds: 100,
    mediaUrl,
    onVisualTimeChange,
  });

  return null;
}

function VideoProbe() {
  hookResult = useMediaPlayback({
    fallbackDurationSeconds: 100,
    mediaUrl,
    onVisualTimeChange,
  });

  return (
    <video
      ref={hookResult.videoRef}
      onPause={hookResult.handlePause}
      onPlay={hookResult.handlePlay}
      onTimeUpdate={hookResult.handleTimeUpdate}
    />
  );
}

async function renderHookProbe() {
  await act(async () => {
    root.render(<Probe />);
  });

  if (!hookResult) {
    throw new Error("Expected media playback hook to render");
  }

  return hookResult;
}

describe("useMediaPlayback", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    hookResult = null;
    mediaUrl = "hinekora-media://recording/one";
    onVisualTimeChange = vi.fn();
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("clamps playback seconds to the available duration", () => {
    expect(clampMediaPlaybackSeconds(Number.NaN, 60)).toBe(0);
    expect(clampMediaPlaybackSeconds(-1, 60)).toBe(0);
    expect(clampMediaPlaybackSeconds(42, 60)).toBe(42);
    expect(clampMediaPlaybackSeconds(90, 60)).toBe(60);
  });

  it("resets playback state when the media URL changes", async () => {
    const result = await renderHookProbe();

    await act(async () => {
      result.seekTo(42);
    });
    expect(hookResult?.playbackSeconds).toBe(42);

    mediaUrl = "hinekora-media://recording/two";
    await renderHookProbe();

    expect(hookResult?.playbackSeconds).toBe(0);
    expect(onVisualTimeChange).toHaveBeenLastCalledWith(0);
  });

  it("publishes presented frames without updating React playback state", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let presentedFrame: VideoFrameRequestCallback | null = null;
    const cancelVideoFrameCallback = vi.fn();

    await act(async () => {
      root.render(<VideoProbe />);
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    if (!video) {
      return;
    }

    Object.defineProperties(video, {
      cancelVideoFrameCallback: { value: cancelVideoFrameCallback },
      requestVideoFrameCallback: {
        value: vi.fn((callback: VideoFrameRequestCallback) => {
          presentedFrame = callback;
          return 7;
        }),
      },
    });

    await act(async () => {
      video.dispatchEvent(new Event("play", { bubbles: true }));
    });
    expect(presentedFrame).not.toBeNull();

    act(() => {
      presentedFrame?.(100, {
        mediaTime: 12.34,
      } as VideoFrameCallbackMetadata);
    });

    expect(onVisualTimeChange).toHaveBeenLastCalledWith(12.34);
    expect(hookResult?.getPlaybackSeconds()).toBe(12.34);
    expect(hookResult?.playbackSeconds).toBe(0);

    video.currentTime = 12.34;
    await act(async () => {
      video.dispatchEvent(new Event("pause", { bubbles: true }));
    });

    expect(hookResult?.playbackSeconds).toBe(12.34);
    expect(cancelVideoFrameCallback).toHaveBeenCalledWith(7);
  });

  it("holds the requested time until the seek destination is presented", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let presentedFrame: VideoFrameRequestCallback | null = null;
    let isSeeking = false;

    await act(async () => {
      root.render(<VideoProbe />);
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    if (!video) {
      return;
    }

    Object.defineProperties(video, {
      cancelVideoFrameCallback: { value: vi.fn() },
      requestVideoFrameCallback: {
        value: vi.fn((callback: VideoFrameRequestCallback) => {
          presentedFrame = callback;
          return 11;
        }),
      },
      seeking: { get: () => isSeeking },
    });

    await act(async () => {
      video.dispatchEvent(new Event("play", { bubbles: true }));
    });

    isSeeking = true;
    await act(async () => {
      hookResult?.seekTo(60);
    });
    act(() => {
      presentedFrame?.(100, {
        mediaTime: 12,
      } as VideoFrameCallbackMetadata);
    });

    expect(onVisualTimeChange).toHaveBeenLastCalledWith(60);
    expect(hookResult?.getPlaybackSeconds()).toBe(60);

    isSeeking = false;
    act(() => {
      presentedFrame?.(116, {
        mediaTime: 60.02,
      } as VideoFrameCallbackMetadata);
    });

    expect(onVisualTimeChange).toHaveBeenLastCalledWith(60.02);
    expect(hookResult?.getPlaybackSeconds()).toBe(60.02);
  });

  it("recovers when settled playback has advanced beyond the seek tolerance", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let presentedFrame: VideoFrameRequestCallback | null = null;

    await act(async () => {
      root.render(<VideoProbe />);
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    if (!video) {
      return;
    }

    Object.defineProperties(video, {
      cancelVideoFrameCallback: { value: vi.fn() },
      requestVideoFrameCallback: {
        value: vi.fn((callback: VideoFrameRequestCallback) => {
          presentedFrame = callback;
          return 17;
        }),
      },
      seeking: { value: false },
    });

    await act(async () => {
      video.dispatchEvent(new Event("play", { bubbles: true }));
      hookResult?.seekTo(60);
    });

    act(() => {
      presentedFrame?.(100, {
        mediaTime: 61,
      } as VideoFrameCallbackMetadata);
    });
    expect(onVisualTimeChange).toHaveBeenLastCalledWith(60);

    act(() => {
      presentedFrame?.(116, {
        mediaTime: 61.02,
      } as VideoFrameCallbackMetadata);
    });
    expect(onVisualTimeChange).toHaveBeenLastCalledWith(61.02);
    expect(hookResult?.getPlaybackSeconds()).toBe(61.02);
  });

  it("uses currentTime through requestAnimationFrame when frame callbacks are unavailable", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let animationFrame: FrameRequestCallback | null = null;
    const cancelAnimationFrame = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrame = callback;
      return 13;
    });

    await act(async () => {
      root.render(<VideoProbe />);
    });

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    if (!video) {
      return;
    }

    await act(async () => {
      video.dispatchEvent(new Event("play", { bubbles: true }));
    });
    video.currentTime = 8.5;
    act(() => {
      animationFrame?.(100);
    });

    expect(onVisualTimeChange).toHaveBeenLastCalledWith(8.5);
    expect(hookResult?.playbackSeconds).toBe(0);

    await act(async () => {
      video.dispatchEvent(new Event("pause", { bubbles: true }));
    });
    expect(cancelAnimationFrame).toHaveBeenCalledWith(13);
  });
});
