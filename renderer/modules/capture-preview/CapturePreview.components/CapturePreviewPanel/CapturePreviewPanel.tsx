import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCapturePreviewSourcePersistence } from "~/renderer/modules/capture-preview/CapturePreview.hooks/useCapturePreviewSourcePersistence/useCapturePreviewSourcePersistence";
import { useCapturePreviewVideoElement } from "~/renderer/modules/capture-preview/CapturePreview.hooks/useCapturePreviewVideoElement/useCapturePreviewVideoElement";
import { useDesktopCaptureStream } from "~/renderer/modules/capture-preview/CapturePreview.hooks/useDesktopCaptureStream/useDesktopCaptureStream";
import { isCapturePreviewSourceAvailable } from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";
import { useManagedRecorderActive } from "~/renderer/modules/managed-recorder/ManagedRecorder.hooks/useManagedRecorderActive/useManagedRecorderActive";
import { useCapturePreviewShallow } from "~/renderer/store";

import { CaptureAutoStartSourceWarning } from "../CaptureAutoStartSourceWarning/CaptureAutoStartSourceWarning";
import { CapturePreviewSourceControls } from "../CapturePreviewSourceControls/CapturePreviewSourceControls";
import { CapturePreviewViewport } from "../CapturePreviewViewport/CapturePreviewViewport";
import {
  canPreviewCaptureSource,
  createDesktopPreviewVideoConstraints,
} from "./CapturePreviewPanel.utils";

function CapturePreviewPanel() {
  const isRecorderActive = useManagedRecorderActive();
  const {
    captureError,
    getThumbnail,
    isLoading,
    recoverSources,
    refresh,
    select,
    selectedThumbnailState,
    selectedSourceId,
    sources,
  } = useCapturePreviewShallow((capturePreview) => ({
    captureError: capturePreview.error,
    getThumbnail: capturePreview.getThumbnail,
    isLoading: capturePreview.isLoading,
    recoverSources: capturePreview.recoverSources,
    refresh: capturePreview.refresh,
    select: capturePreview.select,
    selectedThumbnailState:
      capturePreview.selectedSourceId !== null
        ? capturePreview.thumbnailsBySourceId[capturePreview.selectedSourceId]
        : null,
    selectedSourceId: capturePreview.selectedSourceId,
    sources: capturePreview.sources,
  }));
  const hasRequestedInitialRefreshRef = useRef(false);
  const [previewSourceId, setPreviewSourceId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId) ?? null,
    [selectedSourceId, sources],
  );
  const isPreviewSourceReady =
    previewSourceId !== null &&
    previewSourceId === selectedSource?.id &&
    isCapturePreviewSourceAvailable(selectedSource);

  const {
    persistCaptureTarget,
    selectedSourceMatchesProfileTarget,
    selectedSourceProfile,
  } = useCapturePreviewSourcePersistence(selectedSource);
  const {
    stream,
    error: streamError,
    isStarting,
    stop: stopPreviewStream,
  } = useDesktopCaptureStream({
    sourceId: previewSourceId,
    enabled: isPreviewSourceReady && !isRecorderActive,
    createVideoConstraints: createDesktopPreviewVideoConstraints,
    recoverSources,
  });
  const { clearPreviewVideo, videoRef } = useCapturePreviewVideoElement({
    onPlaybackError: setPreviewError,
    stopPreviewStream,
    stream,
  });
  const isPreviewing = stream !== null || isStarting;

  useEffect(() => {
    if (
      hasRequestedInitialRefreshRef.current ||
      isLoading ||
      sources.length > 0
    ) {
      return;
    }

    hasRequestedInitialRefreshRef.current = true;
    void refresh();
  }, [isLoading, refresh, sources.length]);

  const stopPreview = useCallback(() => {
    stopPreviewStream();
    setPreviewSourceId(null);
    clearPreviewVideo();
  }, [clearPreviewVideo, stopPreviewStream]);

  useEffect(() => {
    if (isRecorderActive) {
      stopPreview();
    }
  }, [isRecorderActive, stopPreview]);

  useEffect(() => {
    if (
      previewSourceId === null ||
      selectedSource === null ||
      !isCapturePreviewSourceAvailable(selectedSource) ||
      previewSourceId === selectedSource.id
    ) {
      return;
    }

    setPreviewError(null);
    setPreviewSourceId(selectedSource.id);
  }, [previewSourceId, selectedSource]);

  const handleSourceChange = (
    sourceId: string,
    source: NonNullable<typeof selectedSource> | null,
  ) => {
    stopPreview();
    select(sourceId);
    if (source) {
      persistCaptureTarget(source);
    }
  };

  const handleRefresh = () => {
    stopPreview();
    void refresh({ force: true });
  };

  const handleStartPreview = async () => {
    if (!canPreviewCaptureSource(selectedSource)) {
      setPreviewError("Select an available screen or window first");
      return;
    }

    stopPreview();
    setPreviewError(null);
    setPreviewSourceId(selectedSource.id);
  };

  const handleTogglePreview = () => {
    if (isPreviewing || previewSourceId !== null) {
      stopPreview();
      return;
    }

    void handleStartPreview();
  };

  useEffect(() => {
    if (!selectedSource || !selectedSourceProfile) {
      return;
    }

    if (!selectedSourceMatchesProfileTarget) {
      return;
    }

    persistCaptureTarget(selectedSource);
  }, [
    persistCaptureTarget,
    selectedSource,
    selectedSourceMatchesProfileTarget,
    selectedSourceProfile,
  ]);

  useEffect(() => {
    if (
      !selectedSource ||
      !isCapturePreviewSourceAvailable(selectedSource) ||
      isPreviewing ||
      selectedThumbnailState !== undefined
    ) {
      return;
    }

    void getThumbnail(selectedSource.id).catch(() => undefined);
  }, [getThumbnail, isPreviewing, selectedSource, selectedThumbnailState]);

  return (
    <section className="col-span-7 grid min-h-[388px] gap-3 rounded-lg border border-base-content/10 bg-neutral p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <h2 className="m-0 font-bold text-primary text-sm">Live Preview</h2>
      </div>

      <CapturePreviewViewport isPreviewing={isPreviewing} videoRef={videoRef} />

      <CapturePreviewSourceControls
        isPreviewing={isPreviewing}
        previewSourceId={previewSourceId}
        onRefresh={handleRefresh}
        onSourceChange={handleSourceChange}
        onTogglePreview={handleTogglePreview}
      />

      <CaptureAutoStartSourceWarning />

      {(captureError || previewError || streamError) && (
        <p className="m-0 text-error text-[0.8125rem]">
          {previewError ?? streamError ?? captureError}
        </p>
      )}
    </section>
  );
}

export { CapturePreviewPanel };
