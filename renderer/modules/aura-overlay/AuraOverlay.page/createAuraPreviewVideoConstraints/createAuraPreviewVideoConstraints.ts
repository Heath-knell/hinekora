import { auraOverlayMaxFps } from "../../AuraOverlay.constants";

function createAuraPreviewVideoConstraints(): MediaTrackConstraints {
  return {
    width: { max: 7680 },
    height: { max: 4320 },
    frameRate: { max: auraOverlayMaxFps },
  };
}

export { createAuraPreviewVideoConstraints };
