import type { AuraVideoSize } from "../AuraOverlay.page.utils.types";

function readAuraVideoSize(
  video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">,
): AuraVideoSize | null {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  return {
    width: video.videoWidth,
    height: video.videoHeight,
  };
}

export { readAuraVideoSize };
