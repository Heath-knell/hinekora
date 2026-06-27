import { type SyntheticEvent, useCallback, useMemo, useRef } from "react";

import type { CropRegion } from "~/types";
import { useAuraVideoCanvasFrame } from "../../AuraOverlay.hooks/useAuraVideoCanvasFrame/useAuraVideoCanvasFrame";
import type {
  AuraSize,
  AuraVideoSize,
} from "../../AuraOverlay.page/AuraOverlay.page.utils";
import styles from "../AuraOverlayPlacement/AuraOverlayPlacement.module.css";
import {
  createStraightenedArcVideoGeometry,
  drawStraightenedArcVideoFrame,
  shouldDrawStraightenedArcFrame,
} from "./AuraStraightenedArcVideo.utils";

interface AuraStraightenedArcVideoProps {
  bindAuraVideo: (element: HTMLVideoElement | null) => void;
  contentTransform: string;
  crop: CropRegion;
  displaySize: AuraSize;
  referenceViewport: AuraVideoSize | null;
  videoSize: AuraVideoSize;
  visibleThickness: number;
  onVideoSizeChange: (event: SyntheticEvent<HTMLVideoElement>) => void;
}

function AuraStraightenedArcVideo({
  bindAuraVideo,
  contentTransform,
  crop,
  displaySize,
  referenceViewport,
  videoSize,
  visibleThickness,
  onVideoSizeChange,
}: AuraStraightenedArcVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roundedWidth = Math.max(1, Math.round(displaySize.width));
  const roundedHeight = Math.max(1, Math.round(displaySize.height));
  const geometry = useMemo(
    () =>
      createStraightenedArcVideoGeometry({
        crop,
        displaySize: {
          height: roundedHeight,
          width: roundedWidth,
        },
        referenceViewport,
        videoSize,
        visibleThickness,
      }),
    [
      crop,
      referenceViewport,
      roundedHeight,
      roundedWidth,
      videoSize,
      visibleThickness,
    ],
  );

  const handleVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      bindAuraVideo(element);
    },
    [bindAuraVideo],
  );

  useAuraVideoCanvasFrame({
    canvasRef,
    drawFrame: drawStraightenedArcVideoFrame,
    geometry,
    shouldDrawFrame: shouldDrawStraightenedArcFrame,
    videoRef,
  });

  return (
    <div
      className={styles.straightenedClip}
      style={{ transform: contentTransform }}
    >
      <video
        aria-hidden="true"
        className={styles.straightenedVideo}
        muted
        playsInline
        ref={handleVideoRef}
        onLoadedMetadata={onVideoSizeChange}
        onResize={onVideoSizeChange}
      />
      <canvas
        aria-label={crop.label}
        className={styles.straightenedCanvas}
        height={roundedHeight}
        ref={canvasRef}
        width={roundedWidth}
      />
    </div>
  );
}

export { AuraStraightenedArcVideo };
