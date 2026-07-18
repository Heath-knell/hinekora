import { auraOverlayFrameIntervalMs } from "../../AuraOverlay.constants";

const frameTimingToleranceMs = 0.1;

function shouldDrawPathSampleVideoFrame(
  nowMs: number,
  lastDrawMs: number | null,
): boolean {
  return (
    lastDrawMs === null ||
    nowMs - lastDrawMs + frameTimingToleranceMs >= auraOverlayFrameIntervalMs
  );
}

export { shouldDrawPathSampleVideoFrame };
