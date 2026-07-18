import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDesktopCaptureStream } from "./useDesktopCaptureStream";

const createVideoConstraints = () => ({
  frameRate: { max: 30 },
  height: { max: 2160 },
  width: { max: 3840 },
});

interface FakeCaptureStream {
  mediaStream: MediaStream;
  streamListeners: Map<string, () => void>;
  trackListeners: Map<string, () => void>;
  stopTrack: ReturnType<typeof vi.fn>;
}

function createFakeCaptureStream(): FakeCaptureStream {
  const streamListeners = new Map<string, () => void>();
  const trackListeners = new Map<string, () => void>();
  const stopTrack = vi.fn();
  const track = {
    addEventListener: vi.fn((event: string, listener: () => void) => {
      trackListeners.set(event, listener);
    }),
    stop: stopTrack,
  } as unknown as MediaStreamTrack;
  const mediaStream = {
    addEventListener: vi.fn((event: string, listener: () => void) => {
      streamListeners.set(event, listener);
    }),
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;

  return { mediaStream, stopTrack, streamListeners, trackListeners };
}

let container: HTMLDivElement;
let root: Root;
let hookResult: ReturnType<typeof useDesktopCaptureStream> | null = null;
let prepareDisplayMediaSource: ReturnType<typeof vi.fn>;
let getDisplayMedia: ReturnType<typeof vi.fn>;
let recoverSources: ReturnType<typeof vi.fn>;
let rootMounted = false;
const electronDescriptor = Object.getOwnPropertyDescriptor(window, "electron");
const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "mediaDevices",
);

interface ProbeProps {
  enabled?: boolean;
  sourceId?: string | null;
}

function Probe({ enabled = true, sourceId = "window:poe2:1" }: ProbeProps) {
  hookResult = useDesktopCaptureStream({
    createVideoConstraints,
    enabled,
    recoverSources: recoverSources as () => Promise<void>,
    sourceId,
  });

  return null;
}

async function flushCapturePromises(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

async function renderProbe(props: ProbeProps = {}): Promise<void> {
  await act(async () => {
    root.render(<Probe {...props} />);
    await flushCapturePromises();
  });
}

async function unmountProbe(): Promise<void> {
  await act(async () => {
    root.unmount();
  });
  rootMounted = false;
}

function restoreProperty(
  target: object,
  property: string,
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor);
    return;
  }

  delete (target as Record<string, unknown>)[property];
}

describe("useDesktopCaptureStream", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    rootMounted = true;
    hookResult = null;
    prepareDisplayMediaSource = vi.fn().mockResolvedValue(true);
    getDisplayMedia = vi.fn();
    recoverSources = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        capturePreview: { prepareDisplayMediaSource },
      },
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getDisplayMedia },
    });
  });

  afterEach(async () => {
    if (rootMounted) {
      await unmountProbe();
    }
    restoreProperty(window, "electron", electronDescriptor);
    restoreProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("prepares the exact source before opening a display media stream", async () => {
    const captureStream = createFakeCaptureStream();
    getDisplayMedia.mockResolvedValue(captureStream.mediaStream);

    await renderProbe();

    expect(prepareDisplayMediaSource).toHaveBeenCalledWith("window:poe2:1");
    expect(getDisplayMedia).toHaveBeenCalledWith({
      audio: false,
      video: createVideoConstraints(),
    });
    expect(prepareDisplayMediaSource.mock.invocationCallOrder[0]).toBeLessThan(
      getDisplayMedia.mock.invocationCallOrder[0] ?? 0,
    );
    expect(hookResult?.stream).toBe(captureStream.mediaStream);
    expect(recoverSources).not.toHaveBeenCalled();

    await act(async () => {
      hookResult?.stop();
    });
    expect(captureStream.stopTrack).toHaveBeenCalledOnce();
  });

  it("refreshes sources before reconnecting an ended window track", async () => {
    vi.useFakeTimers();
    const firstStream = createFakeCaptureStream();
    const restoredStream = createFakeCaptureStream();
    getDisplayMedia
      .mockResolvedValueOnce(firstStream.mediaStream)
      .mockResolvedValueOnce(restoredStream.mediaStream);
    await renderProbe();

    await act(async () => {
      firstStream.trackListeners.get("ended")?.();
      vi.advanceTimersByTime(500);
      await flushCapturePromises();
    });

    expect(prepareDisplayMediaSource).toHaveBeenCalledTimes(2);
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);
    expect(recoverSources).toHaveBeenCalledOnce();
    expect(firstStream.stopTrack).toHaveBeenCalled();
    expect(hookResult?.stream).toBe(restoredStream.mediaStream);
    expect(hookResult?.error).toBeNull();
  });

  it("stops retrying after three failed recovery attempts", async () => {
    vi.useFakeTimers();
    getDisplayMedia.mockRejectedValue(new Error("capture denied"));
    await renderProbe();

    for (const delay of [500, 1_500, 3_000]) {
      await act(async () => {
        vi.advanceTimersByTime(delay);
        await flushCapturePromises();
      });
    }
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await flushCapturePromises();
    });

    expect(prepareDisplayMediaSource).toHaveBeenCalledTimes(4);
    expect(getDisplayMedia).toHaveBeenCalledTimes(4);
    expect(recoverSources).toHaveBeenCalledTimes(3);
    expect(hookResult?.stream).toBeNull();
    expect(hookResult?.isStarting).toBe(false);
    expect(hookResult?.error).toBe("capture denied");
  });

  it("ignores short track mutes and reconnects after the grace period", async () => {
    vi.useFakeTimers();
    const firstStream = createFakeCaptureStream();
    const restoredStream = createFakeCaptureStream();
    getDisplayMedia
      .mockResolvedValueOnce(firstStream.mediaStream)
      .mockResolvedValueOnce(restoredStream.mediaStream);
    await renderProbe();

    await act(async () => {
      firstStream.trackListeners.get("mute")?.();
      vi.advanceTimersByTime(1_000);
      firstStream.trackListeners.get("unmute")?.();
      vi.advanceTimersByTime(1_000);
      await flushCapturePromises();
    });

    expect(getDisplayMedia).toHaveBeenCalledOnce();
    expect(firstStream.stopTrack).not.toHaveBeenCalled();

    await act(async () => {
      firstStream.trackListeners.get("mute")?.();
      vi.advanceTimersByTime(1_500);
      vi.advanceTimersByTime(500);
      await flushCapturePromises();
    });

    expect(getDisplayMedia).toHaveBeenCalledTimes(2);
    expect(firstStream.stopTrack).toHaveBeenCalled();
    expect(hookResult?.stream).toBe(restoredStream.mediaStream);
  });

  it("cancels a pending retry when capture is disabled", async () => {
    vi.useFakeTimers();
    const firstStream = createFakeCaptureStream();
    getDisplayMedia.mockResolvedValue(firstStream.mediaStream);
    await renderProbe();

    await act(async () => {
      firstStream.trackListeners.get("ended")?.();
    });
    await renderProbe({ enabled: false });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await flushCapturePromises();
    });

    expect(getDisplayMedia).toHaveBeenCalledOnce();
    expect(hookResult?.stream).toBeNull();
  });

  it("cancels the old retry and captures a replacement source immediately", async () => {
    vi.useFakeTimers();
    const firstStream = createFakeCaptureStream();
    const replacementStream = createFakeCaptureStream();
    getDisplayMedia
      .mockResolvedValueOnce(firstStream.mediaStream)
      .mockResolvedValueOnce(replacementStream.mediaStream);
    await renderProbe();

    await act(async () => {
      firstStream.trackListeners.get("ended")?.();
    });
    await renderProbe({ sourceId: "window:poe2:replacement" });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await flushCapturePromises();
    });

    expect(prepareDisplayMediaSource).toHaveBeenNthCalledWith(
      2,
      "window:poe2:replacement",
    );
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);
    expect(hookResult?.stream).toBe(replacementStream.mediaStream);
  });

  it("cleans up a pending retry when the consumer unmounts", async () => {
    vi.useFakeTimers();
    getDisplayMedia.mockRejectedValue(new Error("capture denied"));
    await renderProbe();

    await unmountProbe();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await flushCapturePromises();
    });

    expect(getDisplayMedia).toHaveBeenCalledOnce();
  });

  it("resets the retry delay after a stream stays stable", async () => {
    vi.useFakeTimers();
    const firstStream = createFakeCaptureStream();
    const secondStream = createFakeCaptureStream();
    const thirdStream = createFakeCaptureStream();
    getDisplayMedia
      .mockResolvedValueOnce(firstStream.mediaStream)
      .mockResolvedValueOnce(secondStream.mediaStream)
      .mockResolvedValueOnce(thirdStream.mediaStream);
    await renderProbe();

    await act(async () => {
      firstStream.trackListeners.get("ended")?.();
      vi.advanceTimersByTime(500);
      await flushCapturePromises();
    });
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await flushCapturePromises();
    });
    await act(async () => {
      secondStream.trackListeners.get("ended")?.();
      vi.advanceTimersByTime(499);
      await flushCapturePromises();
    });
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await flushCapturePromises();
    });

    expect(getDisplayMedia).toHaveBeenCalledTimes(3);
    expect(hookResult?.stream).toBe(thirdStream.mediaStream);
  });

  it("refreshes before retrying an unavailable prepared source", async () => {
    vi.useFakeTimers();
    const restoredStream = createFakeCaptureStream();
    prepareDisplayMediaSource
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    getDisplayMedia.mockResolvedValue(restoredStream.mediaStream);

    await renderProbe();
    expect(getDisplayMedia).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushCapturePromises();
    });

    expect(recoverSources).toHaveBeenCalledOnce();
    expect(prepareDisplayMediaSource).toHaveBeenCalledTimes(2);
    expect(getDisplayMedia).toHaveBeenCalledOnce();
    expect(hookResult?.stream).toBe(restoredStream.mediaStream);
  });

  it("still performs a bounded retry when source refresh fails", async () => {
    vi.useFakeTimers();
    const restoredStream = createFakeCaptureStream();
    getDisplayMedia
      .mockRejectedValueOnce(new Error("capture denied"))
      .mockResolvedValueOnce(restoredStream.mediaStream);
    recoverSources.mockRejectedValueOnce(new Error("listing failed"));

    await renderProbe();
    await act(async () => {
      vi.advanceTimersByTime(500);
      await flushCapturePromises();
    });

    expect(recoverSources).toHaveBeenCalledOnce();
    expect(getDisplayMedia).toHaveBeenCalledTimes(2);
    expect(hookResult?.stream).toBe(restoredStream.mediaStream);
  });
});
