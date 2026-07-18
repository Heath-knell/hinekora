import { isCapturePreviewSourceAvailable } from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";

import type { CapturePreviewSource } from "~/types";

export function createDesktopPreviewVideoConstraints(): MediaTrackConstraints {
  return {
    width: { max: 3840 },
    height: { max: 2160 },
    frameRate: { max: 30 },
  };
}

export function canPreviewCaptureSource(
  source: CapturePreviewSource | null | undefined,
): source is CapturePreviewSource {
  return Boolean(source && isCapturePreviewSourceAvailable(source));
}
