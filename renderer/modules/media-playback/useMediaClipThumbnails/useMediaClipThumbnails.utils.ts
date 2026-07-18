const thumbnailCanvasWidth = 116;
const thumbnailCanvasHeight = 64;
const seekTimeoutMs = 3_000;
const thumbnailTimePrecision = 4;

async function createClipThumbnails(
  input: {
    count: number;
    inSeconds: number;
    mediaUrl: string;
    outSeconds: number;
  },
  signal?: AbortSignal,
): Promise<string[]> {
  throwIfThumbnailGenerationAborted(signal);
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = input.mediaUrl;

  try {
    await waitForMediaEvent(video, "loadedmetadata", signal);
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForMediaEvent(video, "loadeddata", signal);
    }

    const canvas = document.createElement("canvas");
    canvas.width = thumbnailCanvasWidth;
    canvas.height = thumbnailCanvasHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return [];
    }

    const sourceDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const minSeconds = clampSeconds(input.inSeconds, 0, sourceDuration);
    const maxSeconds = clampSeconds(
      input.outSeconds,
      minSeconds,
      sourceDuration,
    );
    const sampleDuration = Math.max(maxSeconds - minSeconds, 0.001);
    const thumbnails: string[] = [];

    for (let index = 0; index < input.count; index += 1) {
      throwIfThumbnailGenerationAborted(signal);

      const ratio = input.count === 1 ? 0.5 : index / (input.count - 1);
      const sampleSeconds = clampSeconds(
        minSeconds + sampleDuration * ratio,
        minSeconds,
        Math.max(minSeconds, maxSeconds - 0.001),
      );
      await seekVideo(video, sampleSeconds, signal);
      drawVideoFrame(video, context);
      thumbnails.push(canvas.toDataURL("image/jpeg", 0.68));
    }

    return thumbnails;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
}

function createThumbnailCacheKey(input: {
  count: number;
  inSeconds: number;
  mediaUrl: string;
  outSeconds: number;
}): string {
  return [
    input.mediaUrl,
    input.count,
    roundThumbnailSeconds(input.inSeconds),
    roundThumbnailSeconds(input.outSeconds),
  ].join("|");
}

function roundThumbnailSeconds(seconds: number): number {
  return Math.round(seconds * thumbnailTimePrecision) / thumbnailTimePrecision;
}

function drawVideoFrame(
  video: HTMLVideoElement,
  context: CanvasRenderingContext2D,
) {
  context.clearRect(0, 0, thumbnailCanvasWidth, thumbnailCanvasHeight);
  const videoRatio = video.videoWidth / video.videoHeight;
  const canvasRatio = thumbnailCanvasWidth / thumbnailCanvasHeight;
  const sourceWidth =
    videoRatio > canvasRatio
      ? video.videoHeight * canvasRatio
      : video.videoWidth;
  const sourceHeight =
    videoRatio > canvasRatio
      ? video.videoHeight
      : video.videoWidth / canvasRatio;
  const sourceX = (video.videoWidth - sourceWidth) / 2;
  const sourceY = (video.videoHeight - sourceHeight) / 2;

  context.drawImage(
    video,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    thumbnailCanvasWidth,
    thumbnailCanvasHeight,
  );
}

async function seekVideo(
  video: HTMLVideoElement,
  seconds: number,
  signal?: AbortSignal,
): Promise<void> {
  if (
    Math.abs(video.currentTime - seconds) <= 0.001 &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return;
  }

  video.currentTime = seconds;
  await waitForMediaEvent(video, "seeked", signal);
}

function waitForMediaEvent(
  video: HTMLVideoElement,
  eventName: "loadeddata" | "loadedmetadata" | "seeked",
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createThumbnailGenerationAbortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${eventName} timed out`));
    }, seekTimeoutMs);

    const handleEvent = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Failed to load media thumbnail"));
    };

    const handleAbort = () => {
      cleanup();
      reject(createThumbnailGenerationAbortError());
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
    };

    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function throwIfThumbnailGenerationAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createThumbnailGenerationAbortError();
  }
}

function createThumbnailGenerationAbortError(): DOMException {
  return new DOMException("Thumbnail generation canceled", "AbortError");
}

function clampSeconds(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export { createClipThumbnails, createThumbnailCacheKey };
