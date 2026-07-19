import clsx from "clsx";
import type { PointerEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { useCropEditorThumbnailSource } from "~/renderer/modules/crop-editor/CropEditor.hooks/useCropEditorThumbnailSource/useCropEditorThumbnailSource";
import {
  getSelectedProfile,
  resolveActiveAuraCropRegionId,
} from "~/renderer/modules/crop-editor/CropEditor.utils/CropEditor.utils";
import {
  useCropEditorShallow,
  useProfilesShallow,
  useSettingsSelector,
} from "~/renderer/store";

import type { CropRegion } from "~/types";
import styles from "./CropLayoutPreview.module.css";
import {
  type CropPreviewBounds,
  type CropResizeCorner,
  createCropLayoutPreview,
  createCropPreviewStageStyle,
  cropResizeCorners,
  resizeCropRegionFromPreviewDelta,
} from "./CropLayoutPreview.utils";
import { CropPreviewAuraVisibilityToggle } from "./CropPreviewAuraVisibilityToggle/CropPreviewAuraVisibilityToggle";
import { CropPreviewBoxLayer } from "./CropPreviewBoxLayer/CropPreviewBoxLayer";

interface ResizeState {
  regionId: string;
  corner: CropResizeCorner;
  startX: number;
  startY: number;
  bounds: CropPreviewBounds;
  referenceBounds: CropPreviewBounds;
  viewportBounds: CropPreviewBounds;
  initialRegion: CropRegion;
  draftRegion: CropRegion;
}

function isCropResizeCorner(
  value: string | undefined,
): value is CropResizeCorner {
  return cropResizeCorners.includes(value as CropResizeCorner);
}

function CropLayoutPreview() {
  const { profileItems, selectedProfileId, updateProfileFromCurrent } =
    useProfilesShallow((profiles) => ({
      profileItems: profiles.items,
      selectedProfileId: profiles.selectedProfileId,
      updateProfileFromCurrent: profiles.updateFromCurrent,
    }));
  const { selectedAuraCropRegionId, showAllAurasInPreview } =
    useCropEditorShallow((cropEditor) => ({
      selectedAuraCropRegionId: cropEditor.selectedAuraCropRegionId,
      showAllAurasInPreview: cropEditor.showAllAurasInPreview,
    }));
  const activeGame = useSettingsSelector(
    (settings) => settings.value?.activeGame ?? "poe1",
  );
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const profile = getSelectedProfile(
    profileItems,
    selectedProfileId,
    activeGame,
  );
  const { sourceBounds, sourceImageUrl } =
    useCropEditorThumbnailSource(profile);
  const activeAuraCropRegionId = resolveActiveAuraCropRegionId(
    profile,
    selectedAuraCropRegionId,
  );
  const previewProfile = useMemo(() => {
    if (!profile || !resizeState) {
      return profile;
    }

    return {
      ...profile,
      cropRegions: profile.cropRegions.map((region) =>
        region.id === resizeState.regionId ? resizeState.draftRegion : region,
      ),
    };
  }, [profile, resizeState]);
  const preview = useMemo(() => {
    if (!previewProfile) {
      return null;
    }

    return createCropLayoutPreview(
      previewProfile,
      sourceBounds,
      showAllAurasInPreview ? null : activeAuraCropRegionId,
    );
  }, [
    activeAuraCropRegionId,
    previewProfile,
    showAllAurasInPreview,
    sourceBounds,
  ]);

  const handleResizePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!profile || !preview || event.button !== 0) {
      return;
    }

    const regionId = event.currentTarget.dataset.regionId;
    const corner = event.currentTarget.dataset.corner;
    const initialRegion = profile.cropRegions.find(
      (region) => region.id === regionId,
    );
    if (!regionId || !isCropResizeCorner(corner) || !initialRegion) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizeState({
      regionId,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      bounds: preview.bounds,
      referenceBounds: preview.referenceBounds,
      viewportBounds: preview.viewportBounds,
      initialRegion,
      draftRegion: initialRegion,
    });
  };

  const handleResizePointerMove = (event: PointerEvent<HTMLElement>) => {
    const draftRegion = resolveResizeDraftRegion(
      event.clientX,
      event.clientY,
      resizeState,
      stageRef.current,
    );
    if (!resizeState || !draftRegion) {
      return;
    }

    setResizeState({ ...resizeState, draftRegion });
  };

  const handleResizePointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!profile || !resizeState) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const finalRegion =
      resolveResizeDraftRegion(
        event.clientX,
        event.clientY,
        resizeState,
        stageRef.current,
      ) ?? resizeState.draftRegion;
    const { regionId } = resizeState;
    setResizeState(null);
    void updateProfileFromCurrent(profile.id, (currentProfile) => ({
      cropRegions: currentProfile.cropRegions.map((region) =>
        region.id === regionId ? finalRegion : region,
      ),
    })).catch(() => undefined);
  };

  const handleResizePointerCancel = () => {
    setResizeState(null);
  };

  if (!preview) {
    return null;
  }

  return (
    <div className={styles.layoutPreview} aria-label="Aura layout preview">
      <div className={styles.toolbar}>
        <div
          className={styles.legend}
          aria-hidden="true"
          data-onboarding="aura-source-position"
        >
          <span className={clsx(styles.legendItem, styles.sourceLegend)}>
            Source area
          </span>
          <span className={clsx(styles.legendItem, styles.auraLegend)}>
            Aura position
          </span>
        </div>
        <CropPreviewAuraVisibilityToggle />
      </div>
      <div
        className={styles.stage}
        data-testid="aura-layout-preview-stage"
        ref={stageRef}
        style={createCropPreviewStageStyle(preview.bounds)}
      >
        {sourceImageUrl && (
          <img alt="" className={styles.sourceSurface} src={sourceImageUrl} />
        )}
        <CropPreviewBoxLayer
          activeAuraCropRegionId={activeAuraCropRegionId}
          preview={preview}
          sourceImageUrl={sourceImageUrl}
          onResizePointerCancel={handleResizePointerCancel}
          onResizePointerDown={handleResizePointerDown}
          onResizePointerMove={handleResizePointerMove}
          onResizePointerUp={handleResizePointerUp}
        />
      </div>
    </div>
  );
}

function resolveResizeDraftRegion(
  clientX: number,
  clientY: number,
  resizeState: ResizeState | null,
  stage: HTMLDivElement | null,
): CropRegion | null {
  if (!resizeState || !stage) {
    return null;
  }

  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const deltaX =
    ((clientX - resizeState.startX) / rect.width) * resizeState.bounds.width;
  const deltaY =
    ((clientY - resizeState.startY) / rect.height) * resizeState.bounds.height;

  return resizeCropRegionFromPreviewDelta(
    resizeState.initialRegion,
    resizeState.corner,
    deltaX,
    deltaY,
    resizeState.viewportBounds,
    resizeState.referenceBounds,
  );
}

export { CropLayoutPreview };
