import type { DrawPathSampleVideoFrameInput } from "../AuraOverlay.utils.types";

const maxPathSampleSourceCanvasPixels = 4_194_304;
const pathSampleSourceCanvasCache = new WeakMap<
  HTMLCanvasElement,
  HTMLCanvasElement
>();

function drawPathSampleVideoFrame({
  canvas,
  geometry,
  video,
}: DrawPathSampleVideoFrameInput): void {
  const context = canvas.getContext("2d");
  if (!context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  if (canvas.width !== geometry.width) {
    canvas.width = geometry.width;
  }
  if (canvas.height !== geometry.height) {
    canvas.height = geometry.height;
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, geometry.width, geometry.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "medium";

  const source = createPathSampleVideoFrameSource(canvas, geometry, video);

  for (const segment of geometry.segments) {
    context.save();
    context.beginPath();
    context.rect(
      segment.clipX,
      segment.clipY,
      segment.clipWidth,
      segment.clipHeight,
    );
    context.clip();
    context.setTransform(
      segment.transformA,
      segment.transformB,
      segment.transformC,
      segment.transformD,
      segment.transformE,
      segment.transformF,
    );
    context.drawImage(
      source.image,
      segment.sourceX - source.offsetX,
      segment.sourceY - source.offsetY,
      segment.sourceWidth,
      segment.sourceHeight,
      segment.sourceX,
      segment.sourceY,
      segment.sourceWidth,
      segment.sourceHeight,
    );
    context.restore();
  }
}

function createPathSampleVideoFrameSource(
  canvas: HTMLCanvasElement,
  geometry: DrawPathSampleVideoFrameInput["geometry"],
  video: HTMLVideoElement,
): { image: CanvasImageSource; offsetX: number; offsetY: number } {
  const sourceBounds = geometry.sourceBounds;
  if (!sourceBounds) {
    return { image: video, offsetX: 0, offsetY: 0 };
  }
  if (
    sourceBounds.width * sourceBounds.height >
    maxPathSampleSourceCanvasPixels
  ) {
    return { image: video, offsetX: 0, offsetY: 0 };
  }

  let sourceCanvas = pathSampleSourceCanvasCache.get(canvas);
  if (!sourceCanvas) {
    sourceCanvas = document.createElement("canvas");
    pathSampleSourceCanvasCache.set(canvas, sourceCanvas);
  }

  if (sourceCanvas.width !== sourceBounds.width) {
    sourceCanvas.width = sourceBounds.width;
  }
  if (sourceCanvas.height !== sourceBounds.height) {
    sourceCanvas.height = sourceBounds.height;
  }

  const sourceContext = sourceCanvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });
  if (!sourceContext) {
    return { image: video, offsetX: 0, offsetY: 0 };
  }

  sourceContext.setTransform(1, 0, 0, 1, 0, 0);
  sourceContext.drawImage(
    video,
    sourceBounds.x,
    sourceBounds.y,
    sourceBounds.width,
    sourceBounds.height,
    0,
    0,
    sourceBounds.width,
    sourceBounds.height,
  );

  return {
    image: sourceCanvas,
    offsetX: sourceBounds.x,
    offsetY: sourceBounds.y,
  };
}

export { drawPathSampleVideoFrame };
