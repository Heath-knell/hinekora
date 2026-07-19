import { useEffect, useMemo } from "react";

import { useCapturePreviewShallow } from "~/renderer/store";

import type { Profile } from "~/types";
import {
  type CropPreviewBounds,
  resolveCropPreviewSource,
  resolveCropPreviewSourceBounds,
} from "../../CropEditor.components/CropLayoutPreview/CropLayoutPreview.utils";

interface CropEditorThumbnailSource {
  sourceBounds: CropPreviewBounds | null;
  sourceImageUrl: string | null;
}

function useCropEditorThumbnailSource(
  profile: Profile | null,
): CropEditorThumbnailSource {
  const {
    getThumbnail,
    source,
    sourceImageState,
    sourceImageUrl,
    sources,
    selectedSourceId,
  } = useCapturePreviewShallow((capturePreview) => {
    const resolvedSource = profile
      ? resolveCropPreviewSource(
          profile,
          capturePreview.sources,
          capturePreview.selectedSourceId,
        )
      : null;

    return {
      getThumbnail: capturePreview.getThumbnail,
      source: resolvedSource,
      selectedSourceId: capturePreview.selectedSourceId,
      sourceImageState: resolvedSource
        ? capturePreview.thumbnailsBySourceId[resolvedSource.id]
        : null,
      sourceImageUrl: resolvedSource
        ? (capturePreview.thumbnailsBySourceId[resolvedSource.id] ??
          resolvedSource.thumbnailDataUrl ??
          null)
        : null,
      sources: capturePreview.sources,
    };
  });
  const sourceBounds = useMemo(
    () =>
      profile
        ? resolveCropPreviewSourceBounds(profile, sources, selectedSourceId)
        : null,
    [profile, selectedSourceId, sources],
  );
  useEffect(() => {
    if (!source || sourceImageState !== undefined) {
      return;
    }

    void getThumbnail(source.id).catch(() => undefined);
  }, [getThumbnail, source, sourceImageState]);

  return { sourceBounds, sourceImageUrl };
}

export { useCropEditorThumbnailSource };
